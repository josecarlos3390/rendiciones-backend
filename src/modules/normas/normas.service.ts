import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  INormasRepository,
  NORMAS_REPOSITORY,
} from './repositories/normas.repository.interface';
import { Norma, NormaConDimension, NormaFiltro } from './interfaces/norma.interface';
import { CrearNormaDto, ActualizarNormaDto } from './dto/norma.dto';

@Injectable()
export class NormasService {
  private readonly logger = new Logger(NormasService.name);

  constructor(
    @Inject(NORMAS_REPOSITORY)
    private readonly repository: INormasRepository,
  ) {}

  /**
   * Obtiene todas las normas aplicando filtros opcionales
   */
  async findAll(filtro?: NormaFiltro): Promise<NormaConDimension[]> {
    this.logger.debug(`Buscando normas con filtro: ${JSON.stringify(filtro)}`);
    return this.repository.findAll(filtro);
  }

  /**
   * Obtiene una norma por su código de factor
   */
  async findByFactorCode(factorCode: string): Promise<Norma> {
    this.logger.debug(`Buscando norma con factor: ${factorCode}`);
    const norma = await this.repository.findByFactorCode(factorCode);
    
    if (!norma) {
      throw new NotFoundException(`Norma con código '${factorCode}' no encontrada`);
    }
    
    return norma;
  }

  /**
   * Crea una nueva norma
   */
  async create(dto: CrearNormaDto): Promise<Norma> {
    this.logger.debug(`Creando norma: ${JSON.stringify(dto)}`);
    
    // Validaciones de negocio
    if (!dto.factorCode || dto.factorCode.trim() === '') {
      throw new ConflictException('El código del factor es obligatorio');
    }

    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new ConflictException('La descripción es obligatoria');
    }

    if (dto.dimension < 1 || dto.dimension > 99) {
      throw new BadRequestException('La dimensión debe estar entre 1 y 99');
    }

    const factorCodeNormalized = dto.factorCode.trim().toUpperCase();

    return this.repository.create({
      ...dto,
      factorCode: factorCodeNormalized,
    });
  }

  /**
   * Actualiza una norma existente
   */
  async update(factorCode: string, dto: ActualizarNormaDto): Promise<Norma> {
    this.logger.debug(`Actualizando norma ${factorCode}: ${JSON.stringify(dto)}`);
    
    // Validar que existe
    await this.findByFactorCode(factorCode);

    // Validar dimensión si se proporciona
    if (dto.dimension !== undefined && (dto.dimension < 1 || dto.dimension > 99)) {
      throw new BadRequestException('La dimensión debe estar entre 1 y 99');
    }

    // Normalizar descripción si se proporciona
    if (dto.descripcion !== undefined) {
      const trimmed = dto.descripcion.trim();
      if (trimmed === '') {
        throw new ConflictException('La descripción no puede estar vacía');
      }
      dto.descripcion = trimmed;
    }

    return this.repository.update(factorCode, dto);
  }

  /**
   * Elimina una norma
   */
  async remove(factorCode: string): Promise<{ affected: number }> {
    this.logger.debug(`Eliminando norma con factor: ${factorCode}`);
    
    // Validar que existe
    await this.findByFactorCode(factorCode);

    return this.repository.remove(factorCode);
  }

  /**
   * Cambia el estado activo/inactivo de una norma
   */
  async toggleActive(factorCode: string): Promise<Norma> {
    this.logger.debug(`Cambiando estado activo de norma: ${factorCode}`);
    
    const norma = await this.findByFactorCode(factorCode);
    return this.repository.update(factorCode, { activa: !norma.activa });
  }
}
