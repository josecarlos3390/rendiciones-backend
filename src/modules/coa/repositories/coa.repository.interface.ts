import { CuentaCOA, CoaFiltro } from '../interfaces/coa.interface';
import { CrearCuentaDto, ActualizarCuentaDto } from '../dto/coa.dto';

export const COA_REPOSITORY = 'COA_REPOSITORY';

/**
 * Interfaz del repositorio de Plan de Cuentas
 */
export interface ICoaRepository {
  /**
   * Busca todas las cuentas aplicando filtros opcionales
   */
  findAll(filtro?: CoaFiltro): Promise<CuentaCOA[]>;

  /**
   * Busca una cuenta por su código
   */
  findByCode(code: string): Promise<CuentaCOA | null>;

  /**
   * Crea una nueva cuenta
   */
  create(dto: CrearCuentaDto): Promise<CuentaCOA>;

  /**
   * Actualiza una cuenta existente
   */
  update(code: string, dto: ActualizarCuentaDto): Promise<CuentaCOA>;

  /**
   * Elimina una cuenta por su código
   */
  remove(code: string): Promise<{ affected: number }>;

  /**
   * Verifica si existe una cuenta con el código dado
   */
  exists(code: string): Promise<boolean>;
}
