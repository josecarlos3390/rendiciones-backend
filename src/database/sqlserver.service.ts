import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { IDatabaseService } from './interfaces/database.interface';

/**
 * Implementación SQL Server de IDatabaseService.
 *
 * Misma interfaz que HanaService — los repositorios no saben
 * con qué motor están hablando.
 *
 * Nota sobre sintaxis SQL:
 *   HANA usa ?  como placeholder → SELECT * FROM T WHERE ID = ?
 *   SQL Server usa @p1, @p2, ... → SELECT * FROM T WHERE ID = @p1
 *
 *   Los repositorios siempre escriben SQL con ? y este servicio
 *   los convierte automáticamente antes de ejecutar.
 */
@Injectable()
export class SqlServerService implements IDatabaseService, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqlServerService.name);
  private pool: sql.ConnectionPool;

  constructor(private readonly configService: ConfigService) {}

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  async onModuleInit() {
    const dbType = this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
    if (dbType !== 'SQLSERVER') return; // no conectar si no es el motor activo
    await this.createPool();
  }

  async onModuleDestroy() {
    await this.destroyPool();
  }

  // ── Pool ─────────────────────────────────────────────────────────────────────

  private async createPool(): Promise<void> {
    const cfg = this.configService.get('sqlserver');

    const config: sql.config = {
      server:   cfg.host,
      port:     cfg.port,
      user:     cfg.user,
      password: cfg.password,
      database: cfg.database,
      options: {
        encrypt:                cfg.encrypt,
        trustServerCertificate: !cfg.encrypt,
      },
      pool: {
        min:             cfg.pool.min,
        max:             cfg.pool.max,
        idleTimeoutMillis: cfg.pool.idleTimeoutMs,
      },
    };

    try {
      this.pool = await new sql.ConnectionPool(config).connect();
      this.logger.log(`Pool SQL Server creado (min: ${cfg.pool.min}, max: ${cfg.pool.max})`);
    } catch (err: any) {
      this.logger.warn(`SQL Server no disponible al iniciar: ${err.message}. Se reintentará en cada query.`);
    }
  }

  private async destroyPool(): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.close();
      this.logger.log('Pool SQL Server cerrado');
    } catch (err: any) {
      this.logger.error('Error al cerrar el pool SQL Server', err.message);
    }
  }

  // ── IDatabaseService ─────────────────────────────────────────────────────────

  /** SELECT — retorna todas las filas */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const request = this.buildRequest(params);
    const { query, request: req } = this.prepareQuery(sql, params, request);
    const result = await req.query<T>(query);
    return result.recordset;
  }

  /** SELECT — retorna la primera fila o null */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /** INSERT / UPDATE / DELETE — retorna filas afectadas */
  async execute(sql: string, params: any[] = []): Promise<number> {
    const request = this.buildRequest(params);
    const { query, request: req } = this.prepareQuery(sql, params, request);
    const result = await req.query(query);
    return result.rowsAffected[0] ?? 0;
  }

  /**
   * Transacción atómica con COMMIT / ROLLBACK automático.
   */
  async transaction<T>(operations: (tx: IDatabaseService) => Promise<T>): Promise<T> {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    const tx = this.buildTransactionProxy(transaction);

    try {
      const result = await operations(tx);
      await transaction.commit();
      this.logger.debug('Transacción SQL Server: COMMIT');
      return result;
    } catch (err) {
      await transaction.rollback().catch(() => {});
      this.logger.error('Transacción SQL Server: ROLLBACK', err);
      throw err;
    }
  }

  isConnected(): boolean {
    return this.pool?.connected ?? false;
  }

  /**
   * Normaliza el acceso a columnas.
   * SQL Server es case-insensitive en nombres de columna, pero
   * mantenemos el helper por consistencia con la interfaz.
   */
  col(row: Record<string, any>, name: string): any {
    return row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
  }

  // ── Helpers internos ─────────────────────────────────────────────────────────

  /**
   * Convierte placeholders ? al formato @p1, @p2, ... de mssql
   * y registra los parámetros en el Request.
   *
   * Ejemplo:
   *   SQL entrada:  SELECT * FROM T WHERE ID = ? AND ESTADO = ?
   *   SQL salida:   SELECT * FROM T WHERE ID = @p1 AND ESTADO = @p2
   */
  private prepareQuery(
    rawSql:  string,
    params:  any[],
    request: sql.Request,
  ): { query: string; request: sql.Request } {
    let idx   = 0;
    const query = rawSql.replace(/\?/g, () => {
      const name = `p${++idx}`;
      request.input(name, params[idx - 1]);
      return `@${name}`;
    });
    return { query, request };
  }

  private buildRequest(params: any[]): sql.Request {
    if (!this.pool) {
      throw new Error('Sin conexión a SQL Server. Verifica SQL_HOST, SQL_USER y SQL_PASSWORD en .env');
    }
    return new sql.Request(this.pool);
  }

  /**
   * Proxy que usa una transacción activa para todas las operaciones.
   */
  private buildTransactionProxy(transaction: sql.Transaction): IDatabaseService {
    const logger = this.logger;
    const self   = this;

    const makeRequest = () => new sql.Request(transaction);

    return {
      query: async <T>(rawSql: string, params: any[] = []): Promise<T[]> => {
        const req = makeRequest();
        const { query, request } = self.prepareQuery(rawSql, params, req);
        const result = await request.query<T>(query);
        return result.recordset;
      },

      queryOne: async <T>(rawSql: string, params: any[] = []): Promise<T | null> => {
        const req = makeRequest();
        const { query, request } = self.prepareQuery(rawSql, params, req);
        const result = await request.query<T>(query);
        return result.recordset[0] ?? null;
      },

      execute: async (rawSql: string, params: any[] = []): Promise<number> => {
        const req = makeRequest();
        const { query, request } = self.prepareQuery(rawSql, params, req);
        const result = await request.query(query);
        return result.rowsAffected[0] ?? 0;
      },

      transaction: () => Promise.reject(new Error('No se pueden anidar transacciones en SQL Server')),

      isConnected: () => true,

      col: (row, name) => self.col(row, name),
    };
  }
}