import { Proyecto, ProyectoFiltro } from '../interfaces/proyecto.interface';
import { CrearProyectoDto, ActualizarProyectoDto } from '../dto/proyecto.dto';

export const PROYECTOS_REPOSITORY = 'PROYECTOS_REPOSITORY';

/**
 * Interfaz del repositorio de proyectos
 * Define las operaciones CRUD para gestión de proyectos
 */
export interface IProyectosRepository {
  /**
   * Busca todos los proyectos aplicando filtros opcionales
   */
  findAll(filtro?: ProyectoFiltro): Promise<Proyecto[]>;

  /**
   * Busca un proyecto por su código
   */
  findByCode(code: string): Promise<Proyecto | null>;

  /**
   * Crea un nuevo proyecto
   */
  create(dto: CrearProyectoDto): Promise<Proyecto>;

  /**
   * Actualiza un proyecto existente
   */
  update(code: string, dto: ActualizarProyectoDto): Promise<Proyecto>;

  /**
   * Elimina un proyecto por su código
   */
  remove(code: string): Promise<{ affected: number }>;

  /**
   * Verifica si existe un proyecto con el código dado
   */
  exists(code: string): Promise<boolean>;
}
