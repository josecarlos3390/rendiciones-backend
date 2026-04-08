/**
 * Interfaces para las sugerencias de clasificación de gastos
 */

/**
 * Sugerencia de cuenta contable
 */
export interface CuentaSugerida {
  /** ID de la cuenta (UUID o código) */
  id: string;
  /** Código de la cuenta contable */
  codigo: string;
  /** Nombre o descripción de la cuenta */
  nombre: string;
  /** Nivel de confianza (0-1) */
  confianza: number;
  /** Tipo de cuenta (activo, pasivo, gasto, etc.) */
  tipo?: string;
}

/**
 * Sugerida de dimensión/centro de costo
 */
export interface DimensionSugerida {
  /** ID de la dimensión */
  id: string;
  /** Código de la dimensión */
  codigo: string;
  /** Nombre de la dimensión */
  nombre: string;
  /** Nivel de confianza (0-1) */
  confianza: number;
}

/**
 * Sugerida de proyecto
 */
export interface ProyectoSugerido {
  /** ID del proyecto */
  id: string;
  /** Código del proyecto */
  codigo: string;
  /** Nombre del proyecto */
  nombre: string;
  /** Nivel de confianza (0-1) */
  confianza: number;
}

/**
 * Sugerida de norma (solo modo offline)
 */
export interface NormaSugerida {
  /** ID de la norma */
  idNorma: number;
  /** Descripción de la norma */
  descripcion: string;
  /** Nivel de confianza (0-1) */
  confianza: number;
}

/**
 * Respuesta de clasificación sugerida
 */
export interface ClasificacionSugeridaResponse {
  /** Modo de operación: ONLINE u OFFLINE */
  modo: 'ONLINE' | 'OFFLINE';
  /** Cuenta contable sugerida */
  cuentaContable: CuentaSugerida;
  /** Dimensión/centro de costo sugerido (modo online) */
  dimension1?: DimensionSugerida;
  /** Norma sugerida (modo offline) */
  norma?: NormaSugerida;
  /** Proyecto sugerido */
  proyecto?: ProyectoSugerido | null;
  /** Explicación de la sugerencia */
  razon: string;
  /** Fuente de datos utilizada */
  fuenteDatos: 'sap_service_layer' | 'postgres_local';
  /** Timestamp de la sugerencia */
  timestamp: string;
}

/**
 * Datos enviados a Claude para análisis
 */
export interface ClasificacionContext {
  /** Concepto del gasto */
  concepto: string;
  /** Monto del gasto */
  monto: number;
  /** Proveedor (opcional) */
  proveedor?: string;
  /** true si está en modo online */
  esOnline: boolean;
  /** Cuentas contables disponibles */
  cuentasDisponibles: any[];
  /** Dimensiones disponibles (modo online) */
  dimensionesDisponibles?: any[];
  /** Proyectos disponibles */
  proyectosDisponibles?: any[];
  /** Normas disponibles (modo offline) */
  normasDisponibles?: any[];
  /** Historial de clasificaciones del usuario */
  historialUsuario: any[];
}
