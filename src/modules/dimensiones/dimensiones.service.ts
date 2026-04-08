import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  IDimensionesRepository,
  DIMENSIONES_REPOSITORY,
} from './repositories/dimensiones.repository.interface';
import { Dimension, DimensionFiltro } from './interfaces/dimension.interface';
import { CrearDimensionDto, ActualizarDimensionDto } from './dto/dimension.dto';

@Injectable()
export class DimensionesService {
  private readonly logger = new Logger(DimensionesService.name);

  constructor(
    @Inject(DIMENSIONES_REPOSITORY)
    private readonly repository: IDimensionesRepository,
  ) {}

  /**
   * Obtiene todas las dimensiones aplicando filtros opcionales
   */
  async findAll(filtro?: DimensionFiltro): Promise<Dimension[]> {
    this.logger.debug(`Buscando dimensiones con filtro: ${JSON.stringify(filtro)}`);
    return this.repository.findAll(filtro);
  }

  /**
   * Obtiene una dimensión por su código
   */
  async findByCode(code: number): Promise<Dimension> {
    this.logger.debug(`Buscando dimensión con código: ${code}`);
    const dimension = await this.repository.findByCode(code);
    
    if (!dimension) {
      throw new NotFoundException(`Dimensión con código ${code} no encontrada`);
    }
    
    return dimension;
  }

  /**
   * Crea una nueva dimensión
   */
  async create(dto: CrearDimensionDto): Promise<Dimension> {
    this.logger.debug(`Creando dimensión: ${JSON.stringify(dto)}`);
    
    // Validaciones de negocio
    if (!dto.name || dto.name.trim() === '') {
      throw new ConflictException('El nombre de la dimensión es obligatorio');
    }

    if (dto.code < 1 || dto.code > 99) {
      throw new ConflictException('El código debe estar entre 1 y 99');
    }

    const exists = await this.repository.exists(dto.code);
    if (exists) {
      throw new ConflictException(
        `Ya existe una dimensión con el código ${dto.code}`,
      );
    }

    return this.repository.create({
      ...dto,
      name: dto.name.trim(),
    });
  }

  /**
   * Actualiza una dimensión existente
   */
  async update(code: number, dto: ActualizarDimensionDto): Promise<Dimension> {
    this.logger.debug(`Actualizando dimensión ${code}: ${JSON.stringify(dto)}`);
    
    // Validar que existe
    await this.findByCode(code);

    // Normalizar nombre si se proporciona
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (trimmed === '') {
        throw new ConflictException('El nombre de la dimensión no puede estar vacío');
      }
      dto.name = trimmed;
    }

    return this.repository.update(code, dto);
  }

  /**
   * Elimina una dimensión
   */
  async remove(code: number): Promise<{ affected: number }> {
    this.logger.debug(`Eliminando dimensión con código: ${code}`);
    
    // Validar que existe
    await this.findByCode(code);

    return this.repository.remove(code);
  }

  /**
   * Cambia el estado activo/inactivo de una dimensión
   */
  async toggleActive(code: number): Promise<Dimension> {
    this.logger.debug(`Cambiando estado activo de dimensión: ${code}`);
    
    const dimension = await this.findByCode(code);
    return this.repository.update(code, { activa: !dimension.activa });
  }
}
