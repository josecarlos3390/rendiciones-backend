import { Norma, NormaConDimension, NormaFiltro } from '../interfaces/norma.interface';
import { CrearNormaDto, ActualizarNormaDto } from '../dto/norma.dto';

export const NORMAS_REPOSITORY = 'NORMAS_REPOSITORY';

/**
 * Interfaz del repositorio de Normas de Reparto
 */
export interface INormasRepository {
  /**
   * Busca todas las normas aplicando filtros opcionales
   */
  findAll(filtro?: NormaFiltro): Promise<NormaConDimension[]>;

  /**
   * Busca una norma por su código de factor
   */
  findByFactorCode(factorCode: string): Promise<Norma | null>;

  /**
   * Crea una nueva norma
   */
  create(dto: CrearNormaDto): Promise<Norma>;

  /**
   * Actualiza una norma existente
   */
  update(factorCode: string, dto: ActualizarNormaDto): Promise<Norma>;

  /**
   * Elimina una norma por su código de factor
   */
  remove(factorCode: string): Promise<{ affected: number }>;

  /**
   * Verifica si existe una norma con el código dado
   */
  exists(factorCode: string): Promise<boolean>;

  /**
   * Verifica si existe la dimensión referenciada
   */
  dimensionExists(code: number): Promise<boolean>;
}
