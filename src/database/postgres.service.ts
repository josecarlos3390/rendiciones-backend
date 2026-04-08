import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';
import { IDatabaseService } from './interfaces/database.interface';

/**
 * Implementación PostgreSQL de IDatabaseService.
 *
 * Misma interfaz que HanaService y SqlServerService — los repositorios
 * no saben con qué motor están hablando.
 *
 * Nota sobre sintaxis SQL:
 *   HANA / SQL Server usan ?  como placeholder
 *   PostgreSQL usa $1, $2, ... → SELECT * FROM t WHERE id = $1
 *
 *   Los repositorios siempre escriben SQL con ? y este servicio
 *   los convierte automáticamente antes de ejecutar.
 *
 * Nota sobre schema:
 *   PostgreSQL usa search_path para el schema por defecto.
 *   Se configura en la conexión con: SET search_path TO <schema>
 */
@Injectable()
export class PostgresService implements IDatabaseService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private pool: Pool;
  private poolReady = false; // guard contra doble inicialización

  constructor(private readonly configService: ConfigService) {}

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  async onModuleInit() {
    const dbType = this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
    if (dbType !== 'POSTGRES' || this.poolReady) return;
    this.poolReady = true;
    await this.createPool();
  }

  async onModuleDestroy() {
    await this.destroyPool();
  }

  // ── Pool ─────────────────────────────────────────────────────────────────────

  private async createPool(): Promise<void> {
    const cfg = this.configService.get('postgres');

    this.pool = new Pool({
      host:     cfg.host,
      port:     cfg.port,
      user:     cfg.user,
      password: cfg.password,
      database: cfg.database,
      ssl:      cfg.ssl ? { rejectUnauthorized: false } : false,
      min:      cfg.pool.min,
      max:      cfg.pool.max,
      idleTimeoutMillis: cfg.pool.idleTimeoutMs,
    });

    // Aplicar search_path al schema en cada nueva conexión del pool
    const schema = cfg.schema;
    this.pool.on('connect', (client: PoolClient) => {
      client.query(`SET search_path TO "${schema}"`).catch((err) =>
        this.logger.error(`Error al establecer search_path: ${err.message}`),
      );
    });

    // Probar conectividad al arrancar
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log(
        `✅ Pool PostgreSQL creado — host: ${cfg.host}:${cfg.port}, db: ${cfg.database}, schema: ${schema} (min: ${cfg.pool.min}, max: ${cfg.pool.max})`,
      );
    } catch (err: any) {
      this.logger.warn(
        `PostgreSQL no disponible al iniciar: ${err.message}. Se reintentará en cada query.`,
      );
    }
  }

  private async destroyPool(): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.end();
      this.logger.log('Pool PostgreSQL cerrado');
    } catch (err: any) {
      this.logger.error('Error al cerrar el pool PostgreSQL', err.message);
    }
  }

  // ── IDatabaseService ─────────────────────────────────────────────────────────

  /** SELECT — retorna todas las filas */
  async query<T = any>(rawSql: string, params: any[] = []): Promise<T[]> {
    const { sql, values } = this.convertPlaceholders(rawSql, params);
    const result = await this.pool.query<T>(sql, values);
    return result.rows;
  }

  /** SELECT — retorna la primera fila o null */
  async queryOne<T = any>(rawSql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(rawSql, params);
    return rows[0] ?? null;
  }

  /** INSERT / UPDATE / DELETE — retorna filas afectadas */
  async execute(rawSql: string, params: any[] = []): Promise<number> {
    const { sql, values } = this.convertPlaceholders(rawSql, params);
    const result = await this.pool.query(sql, values);
    return result.rowCount ?? 0;
  }

  /**
   * Transacción atómica con COMMIT / ROLLBACK automático.
   */
  async transaction<T>(operations: (tx: IDatabaseService) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const tx = this.buildTransactionProxy(client);
      const result = await operations(tx);
      await client.query('COMMIT');
      this.logger.debug('Transacción PostgreSQL: COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      this.logger.error('Transacción PostgreSQL: ROLLBACK', err);
      throw err;
    } finally {
      client.release();
    }
  }

  isConnected(): boolean {
    return !!this.pool && this.pool.totalCount >= 0;
  }

  /**
   * Normaliza el acceso a columnas cuyo nombre puede variar en mayúsculas/minúsculas.
   * PostgreSQL devuelve los nombres de columna en minúsculas por defecto.
   */
  col(row: Record<string, any>, name: string): any {
    return (
      row[name] ??
      row[name.toLowerCase()] ??
      row[name.toUpperCase()]
    );
  }

  // ── Helpers internos ─────────────────────────────────────────────────────────

  /**
   * Convierte placeholders ? al formato $1, $2, ... de pg.
   *
   * Ejemplo:
   *   SQL entrada:  SELECT * FROM t WHERE id = ? AND estado = ?
   *   SQL salida:   SELECT * FROM t WHERE id = $1 AND estado = $2
   */
  private convertPlaceholders(
    rawSql: string,
    params: any[],
  ): { sql: string; values: any[] } {
    let idx = 0;
    const sql = rawSql.replace(/\?/g, () => `$${++idx}`);
    return { sql, values: params };
  }

  /**
   * Proxy que usa un PoolClient con transacción activa.
   */
  private buildTransactionProxy(client: PoolClient): IDatabaseService {
    return {
      query: async <T>(rawSql: string, params: any[] = []): Promise<T[]> => {
        const { sql, values } = this.convertPlaceholders(rawSql, params);
        const result = await client.query<T>(sql, values);
        return result.rows;
      },

      queryOne: async <T>(rawSql: string, params: any[] = []): Promise<T | null> => {
        const { sql, values } = this.convertPlaceholders(rawSql, params);
        const result = await client.query<T>(sql, values);
        return result.rows[0] ?? null;
      },

      execute: async (rawSql: string, params: any[] = []): Promise<number> => {
        const { sql, values } = this.convertPlaceholders(rawSql, params);
        const result = await client.query(sql, values);
        return result.rowCount ?? 0;
      },

      transaction: () =>
        Promise.reject(new Error('No se pueden anidar transacciones en PostgreSQL')),

      isConnected: () => true,

      col: (row, name) => this.col(row, name),
    };
  }
}