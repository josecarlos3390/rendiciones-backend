/**
 * Interfaz de dominio para Adjunto de Rendición
 */
export interface Adjunto {
  id: number;              // ADJ_ID
  idRendicion: number;     // ADJ_ID_RENDICION
  idRD: number;            // ADJ_ID_RD
  idUsuario: string;       // ADJ_ID_USUARIO
  nombre: string;          // ADJ_NOMBRE (nombre original)
  nombreSys: string;       // ADJ_NOMBRE_SYS (UUID en servidor)
  ruta: string;            // ADJ_RUTA (relativa)
  tipo: string;            // ADJ_TIPO (MIME type)
  tamano: number;          // ADJ_TAMANO (bytes)
  descripcion?: string;    // ADJ_DESCRIPCION
  fecha: Date;             // ADJ_FECHA
}

/**
 * Información básica del adjunto (sin ruta interna)
 * Usado para listar adjuntos al frontend
 */
export interface AdjuntoInfo {
  id: number;
  idRendicion: number;
  idRD: number;
  nombre: string;
  tipo: string;
  tamano: number;
  descripcion?: string;
  fecha: Date;
}
