import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { IProvRepository } from './prov.repository.interface';
import { Prov } from '../interfaces/prov.interface';
import { CreateProvDto } from '../dto/create-prov.dto';
import { tbl } from '../../../database/db-table.helper';

@Injectable()
export class ProvHanaRepository implements IProvRepository {

  private get schema(): string { return this.config.get<string>('hana.schema'); }
  private get dbType(): string { return this.config.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_PROV', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── Consultas ─────────────────────────────────────────────────

  findAll(tipo?: string): Promise<Prov[]> {
    if (tipo) {
      return this.db.query<Prov>(
        `SELECT "U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"
         FROM ${this.DB} WHERE "U_TIPO" = ? ORDER BY "U_RAZON_SOCIAL"`,
        [tipo],
      );
    }
    return this.db.query<Prov>(
      `SELECT "U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"
       FROM ${this.DB} ORDER BY "U_TIPO", "U_RAZON_SOCIAL"`,
    );
  }

  async findByCodigo(codigo: string): Promise<Prov | null> {
    const rows = await this.db.query<Prov>(
      `SELECT "U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"
       FROM ${this.DB} WHERE "U_CODIGO" = ?`, [codigo],
    );
    return rows[0] ?? null;
  }

  async findByNit(nit: string): Promise<Prov | null> {
    const rows = await this.db.query<Prov>(
      `SELECT "U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"
       FROM ${this.DB} WHERE "U_NIT" = ?`, [nit],
    );
    return rows[0] ?? null;
  }

  // ── Generación de código ──────────────────────────────────────

  async getNextCodigo(tipo: string): Promise<string> {
    const prefix = tipo.toUpperCase();

    if (this.dbType === 'POSTGRES') {
      const row = await this.db.queryOne<any>(
        `SELECT rend_retail.next_prov_codigo($1::varchar) AS "NEXT_CODIGO"`,
        [prefix],
      );
      return this.db.col(row, 'NEXT_CODIGO');
    }

    // HANA / SQL Server
    const rows = await this.db.query<any>(
      `SELECT "U_CODIGO" FROM ${this.DB}
       WHERE "U_CODIGO" LIKE ? ORDER BY "U_CODIGO" DESC`,
      [`${prefix}%`],
    );
    let maxNum = 0;
    for (const r of rows) {
      const num = parseInt((this.db.col(r, 'U_CODIGO') as string).substring(2), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return `${prefix}${String(maxNum + 1).padStart(5, '0')}`;
  }

  // ── Mutaciones ────────────────────────────────────────────────

  async create(dto: CreateProvDto): Promise<Prov> {
    const codigo = await this.getNextCodigo(dto.tipo);
    await this.db.execute(
      `INSERT INTO ${this.DB} ("U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO")
       VALUES (?, ?, ?, ?)`,
      [codigo, dto.nit, dto.razonSocial, dto.tipo],
    );
    return { U_CODIGO: codigo, U_NIT: dto.nit, U_RAZON_SOCIAL: dto.razonSocial, U_TIPO: dto.tipo };
  }

  async updateByCodigo(
    codigo: string,
    data: { nit?: string; razonSocial?: string },
  ): Promise<{ affected: number }> {
    const parts:  string[] = [];
    const params: any[]    = [];

    if (data.razonSocial !== undefined) { parts.push('"U_RAZON_SOCIAL" = ?'); params.push(data.razonSocial); }
    if (data.nit         !== undefined) { parts.push('"U_NIT" = ?');          params.push(data.nit); }

    if (!parts.length) return { affected: 0 };

    params.push(codigo);
    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${parts.join(', ')} WHERE "U_CODIGO" = ?`,
      params,
    );
    return { affected };
  }

  async remove(codigo: string): Promise<{ affected: number }> {
    const result = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_CODIGO" = ?`, [codigo],
    );
    return { affected: result ?? 1 };
  }
}