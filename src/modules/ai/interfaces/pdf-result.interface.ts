/**
 * Interfaces para el procesamiento de PDFs con IA
 */

export interface InvoiceData {
  /** NIT del emisor/proveedor */
  nit?: string;
  /** Razón social del emisor */
  razonSocial?: string;
  /** Número de factura */
  numeroFactura?: string;
  /** Fecha de emisión (YYYY-MM-DD) */
  fecha?: string;
  /** Monto total de la factura */
  monto?: number;
  /** Concepto o descripción */
  concepto?: string;
  /** Código de control (facturas bolivianas) */
  codigoControl?: string | null;
  /** CUF (Código Único de Factura) - Bolivia */
  cuf?: string | null;
}

export type ProcessingSource = 'qr_siat' | 'ai_claude' | 'ai_openai' | 'manual';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface PdfProcessingResult {
  /** ID único del resultado */
  id: string;
  /** Nombre del archivo */
  filename: string;
  /** Estado del procesamiento */
  status: ProcessingStatus;
  /** Fuente de extracción */
  source: ProcessingSource;
  /** Nivel de confianza (0-1) */
  confidence: number;
  /** Datos extraídos de la factura */
  data: InvoiceData;
  /** Advertencias (campos faltantes, dudosos, etc.) */
  warnings: string[];
  /** Mensaje de error (si status=error) */
  errorMessage?: string;
  /** URL del preview (si aplica) */
  previewUrl?: string;
  /** Timestamp de inicio */
  startedAt: Date;
  /** Timestamp de finalización */
  completedAt?: Date;
}

export interface ProcessPdfsRequest {
  /** IDs de archivos a procesar */
  fileIds: string[];
  /** ID de la rendición */
  idRendicion: number;
  /** ID del usuario */
  idUsuario: string;
}

export interface ProcessPdfsResponse {
  /** Resultados del procesamiento */
  results: PdfProcessingResult[];
  /** Total de archivos */
  total: number;
  /** Procesados exitosamente */
  completed: number;
  /** Con errores */
  errors: number;
}

export interface ConfirmBatchRequest {
  /** IDs de resultados a confirmar */
  resultIds: string[];
  /** ID de la rendición */
  idRendicion: number;
  /** ID del usuario */
  idUsuario: string;
}

export interface ConfirmBatchResponse {
  /** IDs de líneas creadas en REND_D */
  createdIds: number[];
  /** Total creado */
  totalCreated: number;
}

export interface AiStatusResponse {
  /** Estado de la configuración de IA */
  ia: {
    /** Si IA está habilitada */
    enabled: boolean;
    /** Proveedor configurado */
    provider: string;
    /** Modelo en uso */
    model: string;
    /** Si el proveedor está configurado correctamente */
    configured: boolean;
    /** Versión de la API */
    version: string;
  };
  /** Modo de operación de la aplicación */
  modo: {
    /** Tipo de base de datos */
    dbType: string;
    /** Modo de operación: ONLINE u OFFLINE */
    appMode: string;
    /** true si está en modo ONLINE */
    isOnline: boolean;
    /** true si está en modo OFFLINE */
    isOffline: boolean;
    /** true si usa SAP Service Layer */
    usesServiceLayer: boolean;
    /** true si la configuración es válida */
    isValidConfiguration: boolean;
  };
}
