import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IIntegracionRepository, RendSync } from './integracion.repository.interface';
import { getTableMutex } from '../../../common/utils/db-mutex';

@Injectable()
export class IntegracionHanaRepository implements IIntegracionRepository {

  private get schema(): string { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_SYNC', this.dbType); }
  private get DB_M(): string   { return tbl(this.schema, 'REND_M',    this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private normalize(row: any): RendSync {
    const col = (name: string) => this.db.col(row, name);
    return {
      U_IdSync:      Number(col('U_IdSync')),
      U_IdRendicion: Number(col('U_IdRendicion')),
      U_Estado:      String(col('U_Estado') ?? 'PENDIENTE'),
      U_NroDocERP:   col('U_NroDocERP')  ? String(col('U_NroDocERP'))  : null,
      U_FechaSync:   col('U_FechaSync')  ? String(col('U_FechaSync'))  : null,
      U_LoginAdmin:  col('U_LoginAdmin') ? String(col('U_LoginAdmin')) : null,
      U_Mensaje:     col('U_Mensaje')    ? String(col('U_Mensaje'))    : null,
      U_Intento:     Number(col('U_Intento') ?? 1),
    };
  }

  async findByRendicion(idRendicion: number): Promise<RendSync[]> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdSync","U_IdRendicion","U_Estado","U_NroDocERP",
              "U_FechaSync","U_LoginAdmin","U_Mensaje","U_Intento"
       FROM ${this.DB}
       WHERE "U_IdRendicion" = ?
       ORDER BY "U_IdSync" DESC`,
      [idRendicion],
    );
    return rows.map(r => this.normalize(r));
  }

  async findMisRendiciones(idUsuario: string): Promise<any[]> {
    const rows = await this.db.query<any>(
      `SELECT m."U_IdRendicion", m."U_IdUsuario", m."U_NomUsuario",
              m."U_NombrePerfil", m."U_Objetivo",
              m."U_FechaIni", m."U_FechaFinal", m."U_Monto", m."U_Estado",
              s."U_NroDocERP"
       FROM ${this.DB_M} m
       LEFT JOIN ${this.DB} s
         ON s."U_IdRendicion" = m."U_IdRendicion"
         AND s."U_Estado" = 'OK'
         AND s."U_IdSync" = (
           SELECT MAX(s2."U_IdSync") FROM ${this.DB} s2
           WHERE s2."U_IdRendicion" = m."U_IdRendicion" AND s2."U_Estado" = 'OK'
         )
       WHERE m."U_Estado" IN (3, 5, 6)
         AND m."U_IdUsuario" = ?
       ORDER BY m."U_FechaMod" DESC`,
      [idUsuario],
    );
    return rows.map(r => {
      const col = (name: string) => this.db.col(r, name);
      return {
        U_IdRendicion: Number(col('U_IdRendicion')),
        U_IdUsuario:   String(col('U_IdUsuario')),
        U_NomUsuario:  String(col('U_NomUsuario')   ?? ''),
        U_NombrePerfil:String(col('U_NombrePerfil') ?? ''),
        U_Objetivo:    String(col('U_Objetivo')     ?? ''),
        U_FechaIni:    String(col('U_FechaIni')     ?? ''),
        U_FechaFinal:  String(col('U_FechaFinal')   ?? ''),
        U_Monto:       Number(col('U_Monto')        ?? 0),
        U_Estado:      Number(col('U_Estado')       ?? 0),
        U_NroDocERP:   col('U_NroDocERP') ? String(col('U_NroDocERP')) : null,
      };
    });
  }

  async findPendientes(): Promise<any[]> {
    const rows = await this.db.query<any>(
      `SELECT m."U_IdRendicion", m."U_IdUsuario", m."U_NomUsuario",
              m."U_NombrePerfil", m."U_Objetivo",
              m."U_FechaIni", m."U_FechaFinal", m."U_Monto", m."U_Estado"
       FROM ${this.DB_M} m
       WHERE m."U_Estado" IN (3, 6)
       ORDER BY m."U_FechaMod" DESC`,
      [],
    );
    return rows.map(r => {
      const col = (name: string) => this.db.col(r, name);
      return {
        U_IdRendicion: Number(col('U_IdRendicion')),
        U_IdUsuario:   String(col('U_IdUsuario')),
        U_NomUsuario:  String(col('U_NomUsuario')  ?? ''),
        U_NombrePerfil:String(col('U_NombrePerfil') ?? ''),
        U_Objetivo:    String(col('U_Objetivo')    ?? ''),
        U_FechaIni:    String(col('U_FechaIni')    ?? ''),
        U_FechaFinal:  String(col('U_FechaFinal')  ?? ''),
        U_Monto:       Number(col('U_Monto')       ?? 0),
        U_Estado:      Number(col('U_Estado')      ?? 0),
      };
    });
  }

  async countPendientes(): Promise<number> {
    const row = await this.db.queryOne<any>(
      `SELECT COUNT(*) AS "total" FROM ${this.DB_M}
       WHERE "U_Estado" IN (3, 6)`,
      [],
    );
    return Number(this.db.col(row, 'total') ?? 0);
  }

  async create(data: {
    idRendicion: number;
    estado:      string;
    nroDocERP?:  string;
    loginAdmin:  string;
    mensaje?:    string;
    intento:     number;
  }): Promise<RendSync> {
    const mutex = getTableMutex('REND_SYNC');

    return mutex.runExclusive(async () => {
      const idRows = await this.db.query<any>(
        `SELECT COALESCE(MAX("U_IdSync"), 0) + 1 AS "newId" FROM ${this.DB}`,
      );
      const newId = Number(this.db.col(idRows[0], 'newId')) || 1;
      const now   = new Date().toISOString();

      await this.db.execute(
        `INSERT INTO ${this.DB}
          ("U_IdSync","U_IdRendicion","U_Estado","U_NroDocERP",
            "U_FechaSync","U_LoginAdmin","U_Mensaje","U_Intento")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          data.idRendicion,
          data.estado,
          data.nroDocERP ?? null,
          now,
          data.loginAdmin,
          data.mensaje   ?? null,
          data.intento,
        ],
      );

      const rows = await this.db.query<any>(
        `SELECT * FROM ${this.DB} WHERE "U_IdSync" = ?`, [newId],
      );
      return this.normalize(rows[0]);
    });
  }
}