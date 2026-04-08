/**
 * Interfaz de dominio para Dimensión
 * Equivalente a Dimensions en SAP Business One
 */
export interface Dimension {
  code: number;           // DIM_CODE - Código numérico de dimensión (ej: 1, 2, 3, 4, 5)
  name: string;           // DIM_NAME - Nombre de la dimensión
  descripcion: string;    // DIM_DESCRIPCION - Descripción detallada
  activa: boolean;        // DIM_ACTIVA - Si está activa
}

/**
 * Filtros para búsqueda de dimensiones
 */
export interface DimensionFiltro {
  code?: number;
  name?: string;
  activa?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
