import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  IAdjuntosRepository,
  ADJUNTOS_REPOSITORY,
} from "./repositories/adjuntos.repository.interface";
import {
  Adjunto,
  AdjuntoInfo,
  UploadedFileData,
} from "./interfaces/adjunto.interface";
import { CreateAdjuntoDto } from "./dto/create-adjunto.dto";

// Lista blanca de extensiones permitidas
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
] as const;

// Magic numbers para verificación de archivo
const FILE_SIGNATURES: Record<string, Buffer[]> = {
  "application/pdf": [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  "image/jpeg": [
    Buffer.from([0xff, 0xd8, 0xff]), // JPEG
  ],
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])], // PNG
  "application/msword": [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])], // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // DOCX (ZIP)
  ],
  "application/vnd.ms-excel": [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])], // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // XLSX (ZIP)
  ],
};

type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

interface FileValidationResult {
  valid: boolean;
  extension: AllowedExtension | null;
  realMimetype: string | null;
  error?: string;
}

@Injectable()
export class AdjuntosService {
  private readonly logger = new Logger(AdjuntosService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(ADJUNTOS_REPOSITORY)
    private readonly repository: IAdjuntosRepository,
    private readonly config: ConfigService,
  ) {
    this.uploadDir = this.config.get<string>("upload.dir", "./uploads");
    this.maxFileSize = this.config.get<number>(
      "upload.maxSize",
      10 * 1024 * 1024,
    ); // 10MB default
    this.allowedMimeTypes = this.config
      .get<string>(
        "upload.allowedTypes",
        "application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      )
      .split(",");
  }

  /**
   * Valida la extensión del archivo contra lista blanca
   */
  private validarExtension(originalname: string): FileValidationResult {
    const ext = path.extname(originalname).toLowerCase() as AllowedExtension;

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        extension: null,
        realMimetype: null,
        error: `Extensión no permitida: ${ext}. Extensiones permitidas: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }

    return { valid: true, extension: ext, realMimetype: null };
  }

  /**
   * Detecta el MIME type real basado en magic numbers
   */
  private detectarMimeReal(buffer: Buffer): string | null {
    for (const [mime, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (buffer.length >= signature.length) {
          const fileHeader = buffer.slice(0, signature.length);
          if (fileHeader.equals(signature)) {
            return mime;
          }
        }
      }
    }
    return null;
  }

  /**
   * Valida el contenido real del archivo contra su MIME type declarado
   */
  private validarContenidoArchivo(
    buffer: Buffer,
    declaredMimetype: string,
  ): FileValidationResult {
    const realMimetype = this.detectarMimeReal(buffer);

    if (!realMimetype) {
      return {
        valid: false,
        extension: null,
        realMimetype: null,
        error: "No se pudo detectar el tipo de archivo o formato no soportado",
      };
    }

    // Para archivos ZIP-based (DOCX, XLSX), verificamos que sea ZIP
    const zipBasedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (
      zipBasedTypes.includes(declaredMimetype) &&
      realMimetype === "application/zip"
    ) {
      // Es válido - DOCX/XLSX son archivos ZIP
      return { valid: true, extension: null, realMimetype };
    }

    // Para otros tipos, el MIME debe coincidir exactamente
    if (realMimetype !== declaredMimetype) {
      return {
        valid: false,
        extension: null,
        realMimetype,
        error: `El contenido del archivo (${realMimetype}) no coincide con el tipo declarado (${declaredMimetype}). Posible archivo malicioso.`,
      };
    }

    return { valid: true, extension: null, realMimetype };
  }

  /**
   * Sanitiza el nombre del archivo para evitar path traversal y caracteres peligrosos
   */
  private sanitizarNombre(originalname: string): string {
    // Eliminar caracteres peligrosos y path traversal
    return (
      originalname
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"|?*\x00-\x1f]/g, "") // Caracteres inválidos en Windows/Unix
        .replace(/\.\./g, "") // Path traversal
        .replace(/^\.+/, "") // Puntos al inicio
        .substring(0, 255)
    ); // Límite de longitud
  }

  /**
   * Valida el tipo MIME del archivo (solo como verificación adicional)
   */
  private validarTipo(mimetype: string): boolean {
    return this.allowedMimeTypes.includes(mimetype);
  }

  /**
   * Valida el tamaño del archivo
   */
  private validarTamano(size: number): boolean {
    return size <= this.maxFileSize;
  }

  /**
   * Genera la ruta de almacenamiento para un archivo
   */
  private generarRuta(
    idRendicion: number,
    idRD: number,
    nombreSys: string,
  ): string {
    return path.join(
      this.uploadDir,
      "rendiciones",
      String(idRendicion),
      String(idRD),
      nombreSys,
    );
  }

  /**
   * Asegura que el directorio exista
   */
  private async asegurarDirectorio(ruta: string): Promise<void> {
    const dir = path.dirname(ruta);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Lista todos los adjuntos de una línea de rendición
   */
  async findByRendicionDetalle(
    idRendicion: number,
    idRD: number,
  ): Promise<AdjuntoInfo[]> {
    return this.repository.findByRendicionDetalle(idRendicion, idRD);
  }

  /**
   * Obtiene un adjunto por su ID
   */
  async findById(id: number): Promise<Adjunto> {
    const adjunto = await this.repository.findById(id);
    if (!adjunto) {
      throw new NotFoundException(`Adjunto ${id} no encontrado`);
    }
    return adjunto;
  }

  /**
   * Sube un archivo y crea el registro en BD
   */
  async upload(
    file: UploadedFileData,
    idRendicion: number,
    idRD: number,
    idUsuario: string,
    dto: CreateAdjuntoDto,
  ): Promise<AdjuntoInfo> {
    // 1. Validar extensión contra lista blanca
    const extValidation = this.validarExtension(file.originalname);
    if (!extValidation.valid) {
      throw new BadRequestException(extValidation.error);
    }

    // 2. Validar tipo MIME declarado
    if (!this.validarTipo(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    // 3. Validar tamaño
    if (!this.validarTamano(file.size)) {
      throw new BadRequestException(
        `Archivo demasiado grande: ${file.size} bytes. Máximo permitido: ${this.maxFileSize} bytes`,
      );
    }

    // 4. Validar contenido real del archivo (anti-spoofing)
    const contentValidation = this.validarContenidoArchivo(
      file.buffer,
      file.mimetype,
    );
    if (!contentValidation.valid) {
      this.logger.warn(
        `Intento de subida de archivo sospechoso: ${file.originalname} ` +
          `(declarado: ${file.mimetype}, real: ${contentValidation.realMimetype}) ` +
          `por usuario ${idUsuario}`,
      );
      throw new BadRequestException(contentValidation.error);
    }

    // 5. Sanitizar nombre original
    const nombreSanitizado = this.sanitizarNombre(file.originalname);
    if (!nombreSanitizado || nombreSanitizado.length < 3) {
      throw new BadRequestException("Nombre de archivo inválido");
    }

    // Generar nombre único
    const extension = extValidation.extension!;
    const nombreSys = `${uuidv4()}${extension}`;
    const ruta = this.generarRuta(idRendicion, idRD, nombreSys);

    try {
      // Asegurar directorio y guardar archivo
      await this.asegurarDirectorio(ruta);
      fs.writeFileSync(ruta, file.buffer);

      // Crear registro en BD
      const adjunto = await this.repository.create({
        idRendicion,
        idRD,
        idUsuario,
        nombre: nombreSanitizado,
        nombreSys,
        ruta: path.relative(this.uploadDir, ruta),
        tipo: file.mimetype,
        tamano: file.size,
        descripcion: dto.descripcion,
      });

      this.logger.log(
        `Archivo subido: ${nombreSanitizado} (${file.size} bytes, tipo: ${file.mimetype}) por usuario ${idUsuario}`,
      );

      // Retornar sin datos internos
      return {
        id: adjunto.id,
        idRendicion: adjunto.idRendicion,
        idRD: adjunto.idRD,
        nombre: adjunto.nombre,
        tipo: adjunto.tipo,
        tamano: adjunto.tamano,
        descripcion: adjunto.descripcion,
        fecha: adjunto.fecha,
      };
    } catch (err: unknown) {
      // Limpiar archivo si falló
      if (fs.existsSync(ruta)) {
        fs.unlinkSync(ruta);
      }
      throw new InternalServerErrorException(
        `Error al guardar archivo: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Descarga un archivo
   */
  async download(id: number): Promise<{ adjunto: Adjunto; buffer: Buffer }> {
    const adjunto = await this.findById(id);
    const rutaCompleta = path.join(this.uploadDir, adjunto.ruta);

    if (!fs.existsSync(rutaCompleta)) {
      throw new NotFoundException("Archivo no encontrado en el servidor");
    }

    const buffer = fs.readFileSync(rutaCompleta);
    return { adjunto, buffer };
  }

  /**
   * Elimina un adjunto
   */
  async remove(
    id: number,
    idUsuario: string,
    isAdmin: boolean,
  ): Promise<{ affected: number }> {
    const adjunto = await this.findById(id);

    // Solo el dueño o ADMIN pueden eliminar
    if (adjunto.idUsuario !== idUsuario && !isAdmin) {
      throw new ForbiddenException(
        "No tenés permisos para eliminar este archivo",
      );
    }

    // Eliminar archivo del disco
    const rutaCompleta = path.join(this.uploadDir, adjunto.ruta);
    if (fs.existsSync(rutaCompleta)) {
      fs.unlinkSync(rutaCompleta);
    }

    // Eliminar registro de BD
    const result = await this.repository.remove(id);
    this.logger.log(`Archivo eliminado: ${adjunto.nombre} (ID: ${id})`);

    return result;
  }

  /**
   * Elimina todos los adjuntos de una rendición (incluyendo archivos físicos).
   * Usado por el servicio de RendM para borrado en cascada.
   */
  async removeByRendicion(
    idRendicion: number,
  ): Promise<{ affected: number; errores: string[] }> {
    const adjuntos = await this.repository.findByRendicion(idRendicion);
    let affected = 0;
    const errores: string[] = [];

    for (const adjunto of adjuntos) {
      try {
        // Eliminar archivo del disco
        const rutaCompleta = path.join(this.uploadDir, adjunto.ruta);
        if (fs.existsSync(rutaCompleta)) {
          fs.unlinkSync(rutaCompleta);
        }

        // Eliminar registro de BD
        await this.repository.remove(adjunto.id);
        affected++;
      } catch (err: unknown) {
        this.logger.error(
          `Error al eliminar adjunto ${adjunto.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        errores.push(
          `Adjunto ${adjunto.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Intentar eliminar el directorio de la rendición si está vacío
    try {
      const rendicionDir = path.join(
        this.uploadDir,
        "rendiciones",
        String(idRendicion),
      );
      if (fs.existsSync(rendicionDir)) {
        fs.rmdirSync(rendicionDir, { recursive: true });
      }
    } catch {
      // Ignorar errores al eliminar directorio (puede tener archivos de otras líneas)
    }

    this.logger.log(
      `Eliminados ${affected} adjuntos de la rendición ${idRendicion}`,
    );
    return { affected, errores };
  }
}
