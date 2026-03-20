/**
 * Contrato común para todos los motores de base de datos.
 *
 * Regla: ningún repositorio, service ni módulo debe importar
 * HanaService o SqlServerService directamente.
 * Solo conocen esta interfaz — el motor es un detalle de infraestructura.
 *
 * Para agregar un nuevo motor (ej: PostgreSQL):
 *   1. Crear PostgresService que implemente IDatabaseService
 *   2. Registrarlo en DatabaseModule
 *   3. Nada más cambia.
 */
export interface IDatabaseService {

  /**
   * SELECT — retorna todas las filas que coincidan.
   * Los parámetros se pasan como array para evitar SQL injection.
   *
   * @example
   * db.query<Rendicion>('SELECT * FROM "RENDICIONES" WHERE ID = ?', [id])
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;

  /**
   * SELECT — retorna la primera fila o null si no hay resultados.
   * Atajo conveniente para búsquedas por ID o campos únicos.
   *
   * @example
   * db.queryOne<Usuario>('SELECT * FROM "USUARIOS" WHERE LOGIN = ?', [login])
   */
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  /**
   * INSERT / UPDATE / DELETE — retorna el número de filas afectadas.
   *
   * @example
   * db.execute('UPDATE "RENDICIONES" SET ESTADO = ? WHERE ID = ?', ['ENVIADA', id])
   */
  execute(sql: string, params?: any[]): Promise<number>;

  /**
   * Ejecuta múltiples operaciones dentro de una transacción atómica.
   * Si cualquier operación falla, hace ROLLBACK automático.
   *
   * @example
   * db.transaction(async (tx) => {
   *   await tx.execute('INSERT INTO ...', [...]);
   *   await tx.execute('UPDATE  ...', [...]);
   * })
   */
  transaction<T>(operations: (tx: IDatabaseService) => Promise<T>): Promise<T>;

  /**
   * Verifica si la conexión con la base de datos está activa.
   * Útil para health checks.
   */
  isConnected(): boolean;

  /**
   * Normaliza el acceso a columnas cuyo nombre puede variar en mayúsculas/minúsculas
   * según el driver o versión del motor.
   *
   * Problema: HANA puede devolver 'U_Pass', 'U_PASS' o 'u_pass' dependiendo
   * de la versión del driver. Este helper prueba las tres variantes.
   *
   * @example
   * const pass = db.col(row, 'U_Pass');
   */
  col(row: Record<string, any>, name: string): any;
}

/**
 * Token de inyección para IDatabaseService.
 * Se usa en todos los repositorios en lugar de una clase concreta.
 *
 * @example
 * // En un repositorio:
 * constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}
 *
 * // En un módulo:
 * { provide: DATABASE_SERVICE, useClass: HanaService }
 */
export const DATABASE_SERVICE = 'DATABASE_SERVICE';