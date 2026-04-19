import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as hana from "@sap/hana-client";
import { IDatabaseService } from "./interfaces/database.interface";

/** El driver no exporta Pool como tipo — lo declaramos nosotros */
interface HanaPool {
  getConnection(cb: (err: Error | null, conn: hana.Connection) => void): void;
  clear(cb: (err?: Error) => void): void;
}

/**
 * Implementación SAP HANA de IDatabaseService.
 *
 * Cambios respecto a la versión anterior:
 *  - Implementa IDatabaseService (contrato común con SQL Server)
 *  - Usa connection pool en lugar de una sola conexión compartida
 *  - Agrega queryOne() para evitar el patrón rows[0] ?? null repetido
 *  - Agrega transaction() con COMMIT / ROLLBACK automático
 *  - col() ahora es método de instancia (el static se mantiene por compatibilidad)
 */
@Injectable()
export class HanaService
  implements IDatabaseService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(HanaService.name);
  private pool: HanaPool;

  private readonly POOL_MIN = 2;
  private readonly POOL_MAX = 10;

  constructor(private readonly configService: ConfigService) {}

  // ── Ciclo de vida ────────────────────────────────────────────────────────────

  private poolReady = false;

  async onModuleInit() {
    const dbType = this.configService
      .get<string>("app.dbType", "HANA")
      .toUpperCase();
    if (dbType !== "HANA" || this.poolReady) return;
    this.poolReady = true;
    this.logger.log("Motor de base de datos activo: HANA");
    this.createPool();
    void this.checkConnectivity();
  }

  async onModuleDestroy() {
    await this.destroyPool();
  }

  // ── Pool ─────────────────────────────────────────────────────────────────────

  private createPool(): void {
    const connParams = {
      serverNode: `${this.configService.get("hana.host")}:${this.configService.get("hana.port")}`,
      uid: this.configService.get("hana.user"),
      pwd: this.configService.get("hana.password"),
      currentSchema: this.configService.get("hana.schema"),
      encrypt: this.configService.get("hana.encrypt"),
      sslValidateCertificate: this.configService.get(
        "hana.sslValidateCertificate",
      ),
    };

    this.pool = (hana as any).createPool(connParams, {
      min: this.POOL_MIN,
      max: this.POOL_MAX,
      requestTimeout: 10_000,
      idleTimeout: 60_000,
    });

    this.logger.log(
      `Pool HANA creado (min: ${this.POOL_MIN}, max: ${this.POOL_MAX})`,
    );
  }

  private async destroyPool(): Promise<void> {
    if (!this.pool) return;
    return new Promise((resolve) => {
      this.pool.clear((err) => {
        if (err) this.logger.error("Error al cerrar el pool HANA", err);
        else this.logger.log("Pool HANA cerrado");
        resolve();
      });
    });
  }

  private async checkConnectivity(): Promise<void> {
    try {
      await this.query("SELECT 1 FROM DUMMY");
      this.logger.log("Conectividad con SAP HANA verificada");
    } catch (err: unknown) {
      this.logger.warn(
        `SAP HANA no disponible al iniciar: ${err instanceof Error ? err.message : String(err)}. Se reintentará en cada query.`,
      );
    }
  }

  private getConnection(): Promise<hana.Connection> {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });
  }

  private releaseConnection(conn: hana.Connection): void {
    try {
      // El driver @sap/hana-client devuelve la conexión al pool
      // llamando a conn.disconnect() — el pool la recicla internamente
      (conn as any).disconnect();
    } catch {
      // ignorar errores al liberar
    }
  }

  // ── IDatabaseService ─────────────────────────────────────────────────────────

  /** SELECT — itera con next() para evitar el error -20042 en result sets vacíos */
  async query<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const conn = await this.getConnection();
    let rs: unknown = null;

    try {
      return await new Promise<T[]>((resolve, reject) => {
        const stmt = conn.prepare(sql);
        stmt.execQuery(params, (err, resultSet: unknown) => {
          if (err) {
            this.logger.error(`Query error: ${sql}`, err);
            return reject(err);
          }

          rs = resultSet;
          const rows: T[] = [];

          const fetchNext = () => {
            (rs as any).next((err2: any, hasRow: boolean) => {
              if (err2) {
                this.logger.error(`rs.next error`, err2);
                return reject(err2);
              }
              if (!hasRow) {
                return resolve(rows);
              }
              (rs as any).getValues((err3: any, values: any) => {
                if (err3) {
                  this.logger.error(`getValues error`, err3);
                  return reject(err3);
                }
                rows.push(values as T);
                fetchNext();
              });
            });
          };
          fetchNext();
        });
      });
    } finally {
      // Asegurar que el result set siempre se cierre
      if (rs) {
        try {
          (rs as any).close();
        } catch (err) {
          // Ignorar errores al cerrar result set
          this.logger.debug("Error al cerrar result set (ignorado)", err);
        }
      }
      this.releaseConnection(conn);
    }
  }

  /** SELECT — retorna la primera fila o null */
  async queryOne<T = any>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] ?? null;
  }

  /** INSERT / UPDATE / DELETE — retorna filas afectadas */
  async execute(sql: string, params: unknown[] = []): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await new Promise<number>((resolve, reject) => {
        const stmt = conn.prepare(sql);
        stmt.exec(params, (err: unknown, affected: unknown) => {
          if (err) {
            this.logger.error(`Execute error: ${sql}`, err);
            return reject(err);
          }
          resolve(affected as number);
        });
      });
    } finally {
      this.releaseConnection(conn);
    }
  }

  /**
   * Transacción atómica — usa una sola conexión del pool durante toda
   * la transacción para garantizar el mismo contexto transaccional.
   */
  async transaction<T>(
    operations: (tx: IDatabaseService) => Promise<T>,
  ): Promise<T> {
    const conn = await this.getConnection();
    const tx = this.buildTransactionProxy(conn);

    try {
      await this.execOnConn(
        conn,
        "SET TRANSACTION ISOLATION LEVEL READ COMMITTED",
      );
      const result = await operations(tx);
      await this.execOnConn(conn, "COMMIT");
      this.logger.debug("Transacción HANA: COMMIT");
      return result;
    } catch (err) {
      await this.execOnConn(conn, "ROLLBACK").catch(() => {});
      this.logger.error("Transacción HANA: ROLLBACK", err);
      throw err;
    } finally {
      this.releaseConnection(conn);
    }
  }

  isConnected(): boolean {
    return !!this.pool;
  }

  /** Método de instancia requerido por IDatabaseService */
  col(row: Record<string, unknown>, name: string): any {
    return HanaService.col(row, name);
  }

  /**
   * Normaliza el acceso a columnas — el driver HANA puede devolver
   * nombres en la capitalización original, mayúsculas o minúsculas.
   * @deprecated Usar db.col() — se mantiene por compatibilidad con código existente
   */
  static col(row: Record<string, unknown>, name: string): any {
    return row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
  }

  // ── Helpers internos ─────────────────────────────────────────────────────────

  private execOnConn(conn: hana.Connection, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = conn.prepare(sql);
      stmt.exec([], (err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Proxy que reutiliza una conexión fija dentro de una transacción,
   * sin volver al pool en cada operación.
   */
  private buildTransactionProxy(conn: hana.Connection): IDatabaseService {
    const logger = this.logger;

    const queryOnConn = <T>(
      sql: string,
      params: unknown[] = [],
    ): Promise<T[]> =>
      new Promise((resolve, reject) => {
        let rs: unknown = null;

        const cleanup = () => {
          if (rs) {
            try {
              (rs as any).close();
            } catch {
              // Ignorar errores al cerrar
            }
          }
        };

        const stmt = conn.prepare(sql);
        stmt.execQuery(params, (err, resultSet: any) => {
          if (err) {
            logger.error(`[tx] Query error: ${sql}`, err);
            return reject(err);
          }

          rs = resultSet;
          const rows: T[] = [];

          const fetchNext = () => {
            (rs as any).next((err2: any, hasRow: boolean) => {
              if (err2) {
                cleanup();
                return reject(err2);
              }
              if (!hasRow) {
                cleanup();
                return resolve(rows);
              }
              (rs as any).getValues((err3: any, values: any) => {
                if (err3) {
                  cleanup();
                  return reject(err3);
                }
                rows.push(values as T);
                fetchNext();
              });
            });
          };
          fetchNext();
        });
      });

    return {
      query: queryOnConn,
      queryOne: async <T>(sql: string, params: any[] = []) =>
        (await queryOnConn<T>(sql, params))[0] ?? null,
      execute: (sql: string, params: any[] = []) =>
        new Promise((resolve, reject) => {
          const stmt = conn.prepare(sql);
          stmt.exec(params, (err: any, affected: any) => {
            if (err) {
              logger.error(`[tx] Execute error: ${sql}`, err);
              return reject(err);
            }
            resolve(affected as number);
          });
        }),
      transaction: () =>
        Promise.reject(new Error("No se pueden anidar transacciones en HANA")),
      isConnected: () => true,
      col: (row, name) => HanaService.col(row, name),
    };
  }

  // ── Stored Procedures (específico HANA) ──────────────────────────────────────

  async callProcedure(name: string, params: any[] = []): Promise<any> {
    const sql = `CALL ${name}(${params.map(() => "?").join(", ")})`;
    return this.query(sql, params);
  }
}
