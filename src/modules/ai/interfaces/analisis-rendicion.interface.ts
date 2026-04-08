/**
 * Interfaces para el análisis de rendiciones con IA
 */

/**
 * Resultado del análisis de una rendición
 */
export interface AnalisisRendicionResponse {
  /** ID de la rendición analizada */
  idRendicion: number;
  /** Modo de operación */
  modo: 'ONLINE' | 'OFFLINE';
  /** Score de riesgo (0-100, menor es mejor) */
  scoreRiesgo: number;
  /** Nivel de riesgo */
  nivel: 'bajo' | 'medio' | 'alto';
  /** Recomendación de la IA */
  recomendacion: 'aprobar' | 'rechazar' | 'revisar';
  /** Justificación de la recomendación */
  justificacion: string;
  /** Factores positivos encontrados */
  factoresPositivos: string[];
  /** Factores de riesgo encontrados */
  factoresRiesgo: string[];
  /** Análisis del solicitante */
  analisisSolicitante: {
    nombre: string;
    rendicionesPrevias: number;
    tasaAprobacion: number;
    montoPromedio: number;
    antiguedadMeses: number;
  };
  /** Análisis de montos */
  analisisMontos: {
    montoActual: number;
    montoPromedioUsuario: number;
    montoPromedioDepartamento: number;
    variacionPorcentaje: number;
    esAnormal: boolean;
  };
  /** Análisis de facturas (si aplica) */
  analisisFacturas?: {
    totalFacturas: number;
    facturasValidadas: number;
    facturasConDiscrepancia: number;
    facturasSospechosas: number;
  };
  /** Alertas específicas */
  alertas: string[];
  /** Datos de SAP (solo modo ONLINE) */
  datosSAP?: {
    presupuestoDisponible?: number;
    presupuestoConsumido?: number;
    proveedoresVerificados?: boolean;
  } | null;
  /** Timestamp del análisis */
  timestamp: string;
}

/**
 * Contexto para el análisis de rendición
 */
export interface AnalisisContext {
  /** ID de la rendición */
  idRendicion: number;
  /** Datos de la rendición */
  rendicion: {
    monto: number;
    fecha: string;
    estado: string;
    descripcion?: string;
  };
  /** Datos del solicitante */
  solicitante: {
    id: string;
    nombre: string;
    departamento?: string;
    fechaRegistro: string;
  };
  /** Historial del solicitante */
  historial: Array<{
    idRendicion: number;
    monto: number;
    estado: string;
    fecha: string;
  }>;
  /** Facturas de la rendición actual */
  facturas: Array<{
    nit: string;
    proveedor: string;
    monto: number;
    cuf?: string;
    validadoSiat?: boolean;
  }>;
  /** Estadísticas del departamento (si aplica) */
  statsDepartamento?: {
    montoPromedio: number;
    cantidadRendiciones: number;
  };
  /** Modo ONLINE/OFFLINE */
  esOnline: boolean;
}

/**
 * Sugerencia de acción del aprobador
 */
export interface SugerenciaAprobador {
  /** Acción recomendada */
  accion: 'aprobar' | 'rechazar' | 'revisar';
  /** Confianza en la sugerencia (0-1) */
  confianza: number;
  /** Razón de la sugerencia */
  razon: string;
  /** Tiempo estimado de revisión en minutos */
  tiempoEstimadoRevision: number;
}
