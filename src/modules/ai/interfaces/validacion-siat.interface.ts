/**
 * Interfaces para la validación de facturas contra el SIAT
 */

/**
 * Datos de una factura según el SIAT
 */
export interface DatosSiat {
  /** NIT del emisor */
  nit: string;
  /** Número de factura */
  numero: string;
  /** CUF de la factura */
  cuf: string;
  /** Fecha de emisión */
  fecha: string;
  /** Monto total */
  monto: number;
  /** Estado en el SIAT */
  estado: string;
  /** Razón social del emisor */
  razonSocial?: string;
  /** Código de control */
  codigoControl?: string;
}

/**
 * Discrepancia encontrada entre PDF y SIAT
 */
export interface Discrepancia {
  /** Campo con discrepancia */
  campo: 'nit' | 'numero' | 'fecha' | 'monto' | 'codigoControl' | 'razonSocial';
  /** Valor según el PDF */
  pdf: string | number;
  /** Valor según el SIAT */
  siat: string | number;
  /** Explicación de la discrepancia por la IA */
  explicacion: string;
}

/**
 * Respuesta de validación SIAT
 */
export interface ValidacionSiatResponse {
  /** true si la factura es válida y coincide */
  valido: boolean;
  /** Estado en el SIAT (VIGENTE, ANULADA, etc.) */
  estadoSIAT: string;
  /** Datos de la factura según el SIAT */
  datosSIAT: DatosSiat;
  /** Datos proporcionados del PDF */
  datosPDF: {
    nit?: string;
    numero?: string;
    fecha?: string;
    monto?: number;
  };
  /** Lista de discrepancias encontradas */
  discrepancias: Discrepancia[];
  /** Recomendación de acción */
  recomendacion: string;
  /** Nivel de riesgo */
  riesgo: 'bajo' | 'medio' | 'alto';
  /** Timestamp de la validación */
  timestamp: string;
}

/**
 * Resultado de consulta al SIAT
 */
export interface SiatConsultaResult {
  success: boolean;
  data?: DatosSiat;
  error?: string;
}
