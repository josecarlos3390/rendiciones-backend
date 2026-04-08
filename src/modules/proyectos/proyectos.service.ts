import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  IProyectosRepository,
  PROYECTOS_REPOSITORY,
} from './repositories/proyectos.repository.interface';
import { Proyecto, ProyectoFiltro } from './interfaces/proyecto.interface';
import {
  CrearProyectoDto,
  ActualizarProyectoDto,
} from './dto/proyecto.dto';

@Injectable()
export class ProyectosService {
  private readonly logger = new Logger(ProyectosService.name);

  constructor(
    @Inject(PROYECTOS_REPOSITORY)
    private readonly repository: IProyectosRepository,
  ) {}

  /**
   * Obtiene todos los proyectos aplicando filtros opcionales
   */
  async findAll(filtro?: ProyectoFiltro): Promise<Proyecto[]> {
    this.logger.debug(`Buscando proyectos con filtro: ${JSON.stringify(filtro)}`);
    return this.repository.findAll(filtro);
  }

  /**
   * Obtiene un proyecto por su código
   */
  async findByCode(code: string): Promise<Proyecto> {
    this.logger.debug(`Buscando proyecto con código: ${code}`);
    const proyecto = await this.repository.findByCode(code);
    
    if (!proyecto) {
      throw new NotFoundException(`Proyecto con código '${code}' no encontrado`);
    }
    
    return proyecto;
  }

  /**
   * Crea un nuevo proyecto
   */
  async create(dto: CrearProyectoDto): Promise<Proyecto> {
    this.logger.debug(`Creando proyecto: ${JSON.stringify(dto)}`);
    
    // Validaciones de negocio
    if (!dto.code || dto.code.trim() === '') {
      throw new ConflictException('El código del proyecto es obligatorio');
    }
    
    if (!dto.name || dto.name.trim() === '') {
      throw new ConflictException('El nombre del proyecto es obligatorio');
    }

    // Normalizar código a mayúsculas
    dto.code = dto.code.trim().toUpperCase();
    dto.name = dto.name.trim();

    const exists = await this.repository.exists(dto.code);
    if (exists) {
      throw new ConflictException(
        `Ya existe un proyecto con el código '${dto.code}'`,
      );
    }

    return this.repository.create(dto);
  }

  /**
   * Actualiza un proyecto existente
   */
  async update(code: string, dto: ActualizarProyectoDto): Promise<Proyecto> {
    this.logger.debug(`Actualizando proyecto ${code}: ${JSON.stringify(dto)}`);
    
    // Normalizar el código
    code = code.trim().toUpperCase();

    // Validar que existe
    await this.findByCode(code);

    // Normalizar nombre si se proporciona
    if (dto.name !== undefined) {
      dto.name = dto.name.trim();
      if (dto.name === '') {
        throw new ConflictException('El nombre del proyecto no puede estar vacío');
      }
    }

    return this.repository.update(code, dto);
  }

  /**
   * Elimina un proyecto
   */
  async remove(code: string): Promise<{ affected: number }> {
    this.logger.debug(`Eliminando proyecto con código: ${code}`);
    
    // Normalizar el código
    code = code.trim().toUpperCase();

    // Validar que existe
    await this.findByCode(code);

    return this.repository.remove(code);
  }

  /**
   * Cambia el estado activo/inactivo de un proyecto
   */
  async toggleActive(code: string): Promise<Proyecto> {
    this.logger.debug(`Cambiando estado activo de proyecto: ${code}`);
    
    const proyecto = await this.findByCode(code);
    return this.repository.update(code, { activo: !proyecto.activo });
  }
}
