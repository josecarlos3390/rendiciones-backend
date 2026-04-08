/**
 * Interfaz de dominio para Proyecto
 */
export interface Proyecto {
  code: string;
  name: string;
  activo: boolean;
}

/**
 * Filtros para búsqueda de proyectos
 */
export interface ProyectoFiltro {
  code?: string;
  name?: string;
  activo?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
