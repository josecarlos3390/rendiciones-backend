import { Dimension, DimensionFiltro } from '../interfaces/dimension.interface';
import { CrearDimensionDto, ActualizarDimensionDto } from '../dto/dimension.dto';

export const DIMENSIONES_REPOSITORY = 'DIMENSIONES_REPOSITORY';

/**
 * Interfaz del repositorio de Dimensiones
 */
export interface IDimensionesRepository {
  /**
   * Busca todas las dimensiones aplicando filtros opcionales
   */
  findAll(filtro?: DimensionFiltro): Promise<Dimension[]>;

  /**
   * Busca una dimensión por su código numérico
   */
  findByCode(code: number): Promise<Dimension | null>;

  /**
   * Crea una nueva dimensión
   */
  create(dto: CrearDimensionDto): Promise<Dimension>;

  /**
   * Actualiza una dimensión existente
   */
  update(code: number, dto: ActualizarDimensionDto): Promise<Dimension>;

  /**
   * Elimina una dimensión por su código
   */
  remove(code: number): Promise<{ affected: number }>;

  /**
   * Verifica si existe una dimensión con el código dado
   */
  exists(code: number): Promise<boolean>;
}
