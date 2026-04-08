/**
 * Interfaz de Tipo de Cambio
 * Representa una tasa de cambio para una moneda en una fecha específica
 */
export interface ITipoCambio {
  U_IdTipoCambio?: number;
  U_Fecha: string;        // Formato: YYYY-MM-DD
  U_Moneda: string;       // Ej: 'USD', 'EUR'
  U_Tasa: number;         // Tasa respecto a BOB (cuántos BOB = 1 unidad de moneda)
  U_Activo: string;       // 'Y' | 'N'
}

/**
 * Filtro para búsqueda de tipo de cambio
 */
export interface ITipoCambioFilter {
  fecha?: string;
  moneda?: string;
  activo?: string;
}
