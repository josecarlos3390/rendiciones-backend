import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';

export interface TipoDocSap {
  U_IdTipo:    number;
  U_Nombre:    string;
  U_EsTipoF:   string; // 'F'=Factura | 'R'=Recibo
  U_PermiteGU: string; // 'Y'/'N'
  U_PermiteGD: string; // 'Y'/'N'
  U_Orden:     number;
  U_Activo:    string; // 'Y'/'N'
}

export interface CreateTipoDocSapDto {
  idTipo:    number;
  nombre:    string;
  esTipoF:   'F' | 'R';
  permiteGU: boolean;
  permiteGD: boolean;
  orden:     number;
  activo:    boolean;
}

export type UpdateTipoDocSapDto = Partial<Omit<CreateTipoDocSapDto, 'idTipo'>>;

@Injectable()
export class TipoDocSapRepository {
  private get schema(): string { return this.config.get<string>('hana.schema'); }
  private get dbType(): string { return (this.config.get<string>('app.dbType') ?? 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_TIPO_DOC_SAP', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  private norm(row: any): TipoDocSap {
    const c = (n: string) => this.db.col(row, n);
    return {
      U_IdTipo:    Number(c('U_IdTipo')),
      U_Nombre:    c('U_Nombre')    ?? '',
      U_EsTipoF:   c('U_EsTipoF')   ?? 'F',
      U_PermiteGU: c('U_PermiteGU') ?? 'N',
      U_PermiteGD: c('U_PermiteGD') ?? 'N',
      U_Orden:     Number(c('U_Orden')) || 0,
      U_Activo:    c('U_Activo')    ?? 'Y',
    };
  }

  async findAll(): Promise<TipoDocSap[]> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdTipo","U_Nombre","U_EsTipoF","U_PermiteGU","U_PermiteGD","U_Orden","U_Activo"
       FROM ${this.DB} ORDER BY "U_Orden", "U_IdTipo"`,
    );
    return rows.map(r => this.norm(r));
  }

  async findActivos(): Promise<TipoDocSap[]> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdTipo","U_Nombre","U_EsTipoF","U_PermiteGU","U_PermiteGD","U_Orden","U_Activo"
       FROM ${this.DB} WHERE "U_Activo" = 'Y' ORDER BY "U_Orden", "U_IdTipo"`,
    );
    return rows.map(r => this.norm(r));
  }

  async findOne(idTipo: number): Promise<TipoDocSap | null> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdTipo","U_Nombre","U_EsTipoF","U_PermiteGU","U_PermiteGD","U_Orden","U_Activo"
       FROM ${this.DB} WHERE "U_IdTipo" = ?`,
      [idTipo],
    );
    return rows[0] ? this.norm(rows[0]) : null;
  }

  async exists(idTipo: number): Promise<boolean> {
    const rows = await this.db.query<any>(
      `SELECT 1 FROM ${this.DB} WHERE "U_IdTipo" = ?`, [idTipo],
    );
    return rows.length > 0;
  }

  async create(dto: CreateTipoDocSapDto): Promise<TipoDocSap> {
    await this.db.execute(
      `INSERT INTO ${this.DB}
         ("U_IdTipo","U_Nombre","U_EsTipoF","U_PermiteGU","U_PermiteGD","U_Orden","U_Activo")
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.idTipo, dto.nombre, dto.esTipoF,
        dto.permiteGU ? 'Y' : 'N',
        dto.permiteGD ? 'Y' : 'N',
        dto.orden,
        dto.activo ? 'Y' : 'N',
      ],
    );
    return this.findOne(dto.idTipo);
  }

  async update(idTipo: number, dto: UpdateTipoDocSapDto): Promise<{ affected: number }> {
    const parts: string[] = [];
    const params: any[]   = [];

    if (dto.nombre    !== undefined) { parts.push('"U_Nombre" = ?');    params.push(dto.nombre); }
    if (dto.esTipoF   !== undefined) { parts.push('"U_EsTipoF" = ?');   params.push(dto.esTipoF); }
    if (dto.permiteGU !== undefined) { parts.push('"U_PermiteGU" = ?'); params.push(dto.permiteGU ? 'Y' : 'N'); }
    if (dto.permiteGD !== undefined) { parts.push('"U_PermiteGD" = ?'); params.push(dto.permiteGD ? 'Y' : 'N'); }
    if (dto.orden     !== undefined) { parts.push('"U_Orden" = ?');     params.push(dto.orden); }
    if (dto.activo    !== undefined) { parts.push('"U_Activo" = ?');    params.push(dto.activo ? 'Y' : 'N'); }

    if (!parts.length) return { affected: 0 };

    params.push(idTipo);
    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${parts.join(', ')} WHERE "U_IdTipo" = ?`,
      params,
    );
    return { affected };
  }

  async remove(idTipo: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdTipo" = ?`, [idTipo],
    );
    return { affected };
  }
}