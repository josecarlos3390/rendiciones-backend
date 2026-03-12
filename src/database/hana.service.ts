import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as hana from '@sap/hana-client';

@Injectable()
export class HanaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HanaService.name);
  private connection: hana.Connection;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.connect().catch((err) => {
      this.logger.warn(`HANA no disponible al iniciar: ${err.message}. Se reintentara en cada query.`);
    });
  }

  async onModuleDestroy() { await this.disconnect(); }

  private async connect(): Promise<void> {
    const connParams = {
      serverNode:             `${this.configService.get('hana.host')}:${this.configService.get('hana.port')}`,
      uid:                    this.configService.get('hana.user'),
      pwd:                    this.configService.get('hana.password'),
      currentSchema:          this.configService.get('hana.schema'),
      encrypt:                this.configService.get('hana.encrypt'),
      sslValidateCertificate: this.configService.get('hana.sslValidateCertificate'),
    };
    this.connection = hana.createConnection();
    return new Promise((resolve, reject) => {
      this.connection.connect(connParams, (err) => {
        if (err) { this.logger.error('Error conectando a SAP HANA', err); reject(err); }
        else      { this.logger.log('Conexion a SAP HANA establecida'); resolve(); }
      });
    });
  }

  private async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.connection) return resolve();
      this.connection.disconnect((err) => {
        if (err) this.logger.error('Error al desconectar HANA', err);
        resolve();
      });
    });
  }

  /** SELECT — itera con next() para evitar el error -20042 en result sets vacíos */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.connection) {
      throw new Error('Sin conexion a SAP HANA. Verifica HANA_HOST, HANA_USER y HANA_PASSWORD en .env');
    }
    return new Promise((resolve, reject) => {
      const stmt = this.connection.prepare(sql);
      stmt.execQuery(params, (err, rs: any) => {
        if (err) { this.logger.error(`Query error: ${sql}`, err); return reject(err); }

        const rows: T[] = [];

        const fetchNext = () => {
          rs.next((err2: any, hasRow: boolean) => {
            if (err2) { this.logger.error(`rs.next error: ${sql}`, err2); return reject(err2); }
            if (!hasRow) {
              rs.close();
              return resolve(rows);
            }
            rs.getValues((err3: any, values: any) => {
              if (err3) { this.logger.error(`getValues error: ${sql}`, err3); return reject(err3); }
              rows.push(values as T);
              fetchNext();
            });
          });
        };

        fetchNext();
      });
    });
  }

  /** INSERT / UPDATE / DELETE — retorna filas afectadas */
  async execute(sql: string, params: any[] = []): Promise<number> {
    if (!this.connection) {
      throw new Error('Sin conexion a SAP HANA. Verifica HANA_HOST, HANA_USER y HANA_PASSWORD en .env');
    }
    return new Promise((resolve, reject) => {
      const stmt = this.connection.prepare(sql);
      stmt.exec(params, (err: any, affected: any) => {
        if (err) { this.logger.error(`Execute error: ${sql}`, err); return reject(err); }
        resolve(affected as number);
      });
    });
  }

  /**
   * Normaliza el acceso a columnas de filas HANA.
   * El driver puede devolver nombres en la capitalización original, en mayúsculas
   * o en minúsculas dependiendo de la versión. Este helper prueba las tres variantes.
   *
   * Uso:  HanaService.col(row, 'U_Pass')
   */
  static col(row: any, name: string): any {
    return row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
  }

  /** Stored Procedures */
  async callProcedure(name: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const sql  = `CALL ${name}(${params.map(() => '?').join(', ')})`;
      const stmt = this.connection.prepare(sql);
      stmt.exec(params, (err, result) => {
        if (err) { this.logger.error(`Procedure error: ${name}`, err); return reject(err); }
        resolve(result);
      });
    });
  }
}