import { ITipoCambio, ITipoCambioFilter } from '../interfaces/tipo-cambio.interface';
import { CreateTipoCambioDto, UpdateTipoCambioDto } from '../dto/create-tipo-cambio.dto';

export const TIPO_CAMBIO_REPOSITORY = Symbol('TIPO_CAMBIO_REPOSITORY');

/**
 * Interfaz del repositorio de tipos de cambio
 * Implementado por HANARepository (ONLINE) y SQLRepository (OFFLINE)
 */
export interface ITipoCambioRepository {
  /**
   * Buscar tipo de cambio por fecha y moneda
   * @param fecha - Fecha en formato YYYY-MM-DD
   * @param moneda - Código de moneda (ej: 'USD')
   * @returns Tasa de cambio o null si no existe
   */
  findByFechaMoneda(fecha: string, moneda: string): Promise<number | null>;

  /**
   * Buscar tipo de cambio completo por fecha y moneda
   */
  findByFechaMonedaCompleto(fecha: string, moneda: string): Promise<ITipoCambio | null>;

  /**
   * Crear nuevo tipo de cambio
   */
  create(data: CreateTipoCambioDto): Promise<ITipoCambio>;

  /**
   * Actualizar tipo de cambio
   */
  update(id: number, data: UpdateTipoCambioDto): Promise<ITipoCambio>;

  /**
   * Buscar todos los tipos de cambio con filtros opcionales
   */
  findAll(filter?: ITipoCambioFilter): Promise<ITipoCambio[]>;

  /**
   * Eliminar tipo de cambio (soft delete)
   */
  remove(id: number): Promise<void>;

  /**
   * Verificar si existe tipo de cambio para fecha/moneda
   */
  exists(fecha: string, moneda: string): Promise<boolean>;
}
