/**
 * Interfaz de dominio para Norma de Reparto
 * Las normas definen cómo se distribuyen los importes entre dimensiones
 */
export interface Norma {
  factorCode: string;     // NR_FACTOR_CODE - Código del factor (ej: "ADM", "VTA", "PROD")
  descripcion: string;    // NR_DESCRIPCION - Descripción de la norma
  dimension: number;      // NR_DIMENSION - Código de dimensión asociada (FK)
  activa: boolean;        // NR_ACTIVA - Si está activa
}

/**
 * Norma con información de la dimensión (para joins)
 */
export interface NormaConDimension extends Norma {
  dimensionName: string;  // DIM_NAME - Nombre de la dimensión
}

/**
 * Filtros para búsqueda de normas
 */
export interface NormaFiltro {
  factorCode?: string;
  descripcion?: string;
  dimension?: number;
  activa?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
