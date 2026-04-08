import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '@database/interfaces/database.interface';
import { IAdjuntosRepository } from './adjuntos.repository.interface';
import { Adjunto, AdjuntoInfo } from '../interfaces/adjunto.interface';
import { tbl } from '@database/db-table.helper';

@Injectable()
export class AdjuntosRepository implements IAdjuntosRepository {
  private get schema(): string {
    return this.config.get<string>('hana.schema');
  }

  private get dbType(): string {
    return this.config.get<string>('app.dbType', 'HANA').toUpperCase();
  }

  private get DB(): string {
    return tbl(this.schema, 'REND_ADJUNTOS', this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza una fila de BD a AdjuntoInfo (sin datos internos)
   */
  private normalizeInfo(row: any): AdjuntoInfo {
    return {
      id: Number(this.db.col(row, 'ADJ_ID')),
      idRendicion: Number(this.db.col(row, 'ADJ_ID_RENDICION')),
      idRD: Number(this.db.col(row, 'ADJ_ID_RD')),
      nombre: String(this.db.col(row, 'ADJ_NOMBRE')),
      tipo: String(this.db.col(row, 'ADJ_TIPO') ?? 'application/octet-stream'),
      tamano: Number(this.db.col(row, 'ADJ_TAMANO') ?? 0),
      descripcion: this.db.col(row, 'ADJ_DESCRIPCION') || undefined,
      fecha: new Date(this.db.col(row, 'ADJ_FECHA') ?? Date.now()),
    };
  }

  /**
   * Normaliza una fila completa (con datos internos)
   */
  private normalize(row: any): Adjunto {
    return {
      ...this.normalizeInfo(row),
      idUsuario: String(this.db.col(row, 'ADJ_ID_USUARIO')),
      nombreSys: String(this.db.col(row, 'ADJ_NOMBRE_SYS')),
      ruta: String(this.db.col(row, 'ADJ_RUTA')),
    };
  }

  async findByRendicionDetalle(
    idRendicion: number,
    idRD: number,
  ): Promise<AdjuntoInfo[]> {
    try {
      const sql = `
        SELECT "ADJ_ID", "ADJ_ID_RENDICION", "ADJ_ID_RD", 
               "ADJ_NOMBRE", "ADJ_TIPO", "ADJ_TAMANO", 
               "ADJ_DESCRIPCION", "ADJ_FECHA"
        FROM ${this.DB}
        WHERE "ADJ_ID_RENDICION" = ? AND "ADJ_ID_RD" = ?
        ORDER BY "ADJ_FECHA" DESC
      `;
      const rows = await this.db.query<any>(sql, [idRendicion, idRD]);
      return rows.map((r) => this.normalizeInfo(r));
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al consultar adjuntos: ${err.message}`,
      );
    }
  }

  async findById(id: number): Promise<Adjunto | null> {
    try {
      const sql = `
        SELECT "ADJ_ID", "ADJ_ID_RENDICION", "ADJ_ID_RD", "ADJ_ID_USUARIO",
               "ADJ_NOMBRE", "ADJ_NOMBRE_SYS", "ADJ_RUTA", "ADJ_TIPO", 
               "ADJ_TAMANO", "ADJ_DESCRIPCION", "ADJ_FECHA"
        FROM ${this.DB}
        WHERE "ADJ_ID" = ?
      `;
      const rows = await this.db.query<any>(sql, [id]);
      return rows[0] ? this.normalize(rows[0]) : null;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al buscar adjunto: ${err.message}`,
      );
    }
  }

  async create(data: {
    idRendicion: number;
    idRD: number;
    idUsuario: string;
    nombre: string;
    nombreSys: string;
    ruta: string;
    tipo: string;
    tamano: number;
    descripcion?: string;
  }): Promise<Adjunto> {
    try {
      if (this.dbType === 'POSTGRES') {
        const sql = `
          INSERT INTO ${this.DB} 
          ("ADJ_ID_RENDICION", "ADJ_ID_RD", "ADJ_ID_USUARIO", "ADJ_NOMBRE", 
           "ADJ_NOMBRE_SYS", "ADJ_RUTA", "ADJ_TIPO", "ADJ_TAMANO", "ADJ_DESCRIPCION")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING "ADJ_ID", "ADJ_FECHA"
        `;
        const result = await this.db.query<any>(sql, [
          data.idRendicion,
          data.idRD,
          data.idUsuario,
          data.nombre,
          data.nombreSys,
          data.ruta,
          data.tipo,
          data.tamano,
          data.descripcion || null,
        ]);
        return {
          id: Number(result[0].ADJ_ID),
          idRendicion: data.idRendicion,
          idRD: data.idRD,
          idUsuario: data.idUsuario,
          nombre: data.nombre,
          nombreSys: data.nombreSys,
          ruta: data.ruta,
          tipo: data.tipo,
          tamano: data.tamano,
          descripcion: data.descripcion,
          fecha: new Date(result[0].ADJ_FECHA),
        };
      } else {
        // HANA / SQL Server
        const sql = `
          INSERT INTO ${this.DB} 
          ("ADJ_ID_RENDICION", "ADJ_ID_RD", "ADJ_ID_USUARIO", "ADJ_NOMBRE", 
           "ADJ_NOMBRE_SYS", "ADJ_RUTA", "ADJ_TIPO", "ADJ_TAMANO", "ADJ_DESCRIPCION")
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await this.db.execute(sql, [
          data.idRendicion,
          data.idRD,
          data.idUsuario,
          data.nombre,
          data.nombreSys,
          data.ruta,
          data.tipo,
          data.tamano,
          data.descripcion || null,
        ]);

        // Obtener el ID generado
        const idResult = await this.db.query<any>(
          `SELECT MAX("ADJ_ID") as ID FROM ${this.DB} WHERE "ADJ_ID_RENDICION" = ? AND "ADJ_ID_RD" = ?`,
          [data.idRendicion, data.idRD],
        );

        return {
          id: Number(idResult[0]?.ID || 0),
          idRendicion: data.idRendicion,
          idRD: data.idRD,
          idUsuario: data.idUsuario,
          nombre: data.nombre,
          nombreSys: data.nombreSys,
          ruta: data.ruta,
          tipo: data.tipo,
          tamano: data.tamano,
          descripcion: data.descripcion,
          fecha: new Date(),
        };
      }
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al crear adjunto: ${err.message}`,
      );
    }
  }

  async remove(id: number): Promise<{ affected: number }> {
    try {
      const sql = `DELETE FROM ${this.DB} WHERE "ADJ_ID" = ?`;
      const result = await this.db.execute(sql, [id]);
      return { affected: result ?? 1 };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al eliminar adjunto: ${err.message}`,
      );
    }
  }

  async exists(id: number): Promise<boolean> {
    const adjunto = await this.findById(id);
    return adjunto !== null;
  }

  async findByRendicion(idRendicion: number): Promise<Adjunto[]> {
    try {
      const sql = `
        SELECT "ADJ_ID", "ADJ_ID_RENDICION", "ADJ_ID_RD", "ADJ_ID_USUARIO",
               "ADJ_NOMBRE", "ADJ_NOMBRE_SYS", "ADJ_RUTA", "ADJ_TIPO", 
               "ADJ_TAMANO", "ADJ_DESCRIPCION", "ADJ_FECHA"
        FROM ${this.DB}
        WHERE "ADJ_ID_RENDICION" = ?
        ORDER BY "ADJ_ID_RD", "ADJ_FECHA" DESC
      `;
      const rows = await this.db.query<any>(sql, [idRendicion]);
      return rows.map((r) => this.normalize(r));
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al buscar adjuntos de la rendición: ${err.message}`,
      );
    }
  }
}
