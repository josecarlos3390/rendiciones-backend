/**
 * Interfaz de dominio para Cuenta del Plan de Cuentas (COA)
 * Equivalente a ChartOfAccounts en SAP
 */
export interface CuentaCOA {
  code: string;           // COA_CODE - Código de cuenta (ej: "110101", "42010001")
  name: string;           // COA_NAME - Nombre/descripción
  formatCode: string;     // COA_FORMAT_CODE - Código de formato
  asociada: boolean;      // COA_ASOCIADA - Si es cuenta asociada/título
  activa: boolean;        // COA_ACTIVA - Si está activa
}

/**
 * Filtros para búsqueda de cuentas
 */
export interface CoaFiltro {
  code?: string;
  name?: string;
  activa?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
