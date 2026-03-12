import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as hana from '@sap/hana-client';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private connection: hana.Connection;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  // ─── Conexión ────────────────────────────────────────────────────────────────

  private async connect(): Promise<void> {
    try {
      this.connection = hana.createConnection();

      const params = {
        serverNode: `${this.configService.get('HANA_HOST')}:${this.configService.get('HANA_PORT')}`,
        uid: this.configService.get('HANA_USER'),
        pwd: this.configService.get('HANA_PASSWORD'),
        currentSchema: this.configService.get('HANA_SCHEMA'),
      };

      await new Promise<void>((resolve, reject) => {
        this.connection.connect(params, (err) => {
          if (err) {
            reject(err);
          } else {
            this.logger.log('✅ Conexión a SAP HANA establecida');
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.error('❌ Error al conectar con SAP HANA', error.message);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    if (this.connection) {
      await new Promise<void>((resolve) => {
        this.connection.disconnect((err) => {
          if (err) {
            this.logger.warn('Advertencia al desconectar HANA:', err.message);
          } else {
            this.logger.log('Conexión a SAP HANA cerrada');
          }
          resolve();
        });
      });
    }
  }

  // ─── Métodos de consulta ─────────────────────────────────────────────────────

  /**
   * Ejecuta una consulta SELECT y retorna múltiples filas
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.connection.exec(sql, params, (err, rows) => {
        if (err) {
          this.logger.error(`Error en query: ${sql}`, err.message);
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Ejecuta una consulta y retorna una sola fila
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Ejecuta INSERT / UPDATE / DELETE y retorna filas afectadas
   */
  async execute(sql: string, params: any[] = []): Promise<number> {
    return new Promise((resolve, reject) => {
      this.connection.exec(sql, params, (err, affectedRows) => {
        if (err) {
          this.logger.error(`Error en execute: ${sql}`, err.message);
          reject(err);
        } else {
          resolve(affectedRows as number);
        }
      });
    });
  }

  /**
   * Ejecuta múltiples sentencias dentro de una transacción
   */
  async transaction<T>(
    operations: (db: DatabaseService) => Promise<T>,
  ): Promise<T> {
    try {
      await this.execute('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      const result = await operations(this);
      await this.execute('COMMIT');
      return result;
    } catch (error) {
      await this.execute('ROLLBACK');
      this.logger.error('Transacción revertida (ROLLBACK)', error.message);
      throw error;
    }
  }

  /**
   * Llama a un stored procedure de HANA
   */
  async callProcedure<T = any>(
    procedureName: string,
    params: any[] = [],
  ): Promise<T[]> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;
    return this.query<T>(sql, params);
  }

  /**
   * Verifica si la conexión está activa
   */
  isConnected(): boolean {
    return this.connection?.state() === 'connected';
  }
}
