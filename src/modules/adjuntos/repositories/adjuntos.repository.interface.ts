import { Adjunto, AdjuntoInfo } from '../interfaces/adjunto.interface';

export const ADJUNTOS_REPOSITORY = 'ADJUNTOS_REPOSITORY';

/**
 * Interfaz del repositorio de Adjuntos
 */
export interface IAdjuntosRepository {
  /**
   * Busca todos los adjuntos de una línea de rendición
   */
  findByRendicionDetalle(idRendicion: number, idRD: number): Promise<AdjuntoInfo[]>;

  /**
   * Busca un adjunto por su ID
   */
  findById(id: number): Promise<Adjunto | null>;

  /**
   * Crea un nuevo registro de adjunto
   */
  create(data: {
    idRendicion: number;
    idRD: number;
    idUsuario: string;
    nombre: string;
    nombreSys: string;
    ruta: string;
    tipo: string;
    tamano: number;
    descripcion?: string;
  }): Promise<Adjunto>;

  /**
   * Elimina un adjunto por su ID
   */
  remove(id: number): Promise<{ affected: number }>;

  /**
   * Busca todos los adjuntos de una rendición (todas sus líneas de detalle)
   */
  findByRendicion(idRendicion: number): Promise<Adjunto[]>;

  /**
   * Verifica si existe un adjunto con el ID dado
   */
  exists(id: number): Promise<boolean>;
}
