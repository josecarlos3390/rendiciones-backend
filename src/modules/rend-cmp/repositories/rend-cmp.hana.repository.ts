import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IRendCmpRepository, RendCmp } from './rend-cmp.repository.interface';
import { getTableMutex } from '../../../common/utils/db-mutex';

@Injectable()
export class RendCmpHanaRepository implements IRendCmpRepository {

  private get schema(): string { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_CMP', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private normalize(row: any): RendCmp {
    const col = (name: string) => this.db.col(row, name);
    return {
      U_IdCampo:     Number(col('U_IdCampo')),
      U_Descripcion: String(col('U_Descripcion') ?? ''),
      U_Campo:       String(col('U_Campo')       ?? ''),
    };
  }

  async findAll(): Promise<RendCmp[]> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdCampo", "U_Descripcion", "U_Campo"
       FROM ${this.DB}
       ORDER BY "U_IdCampo" ASC`,
    );
    return rows.map(r => this.normalize(r));
  }

  async findOne(id: number): Promise<RendCmp | null> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdCampo", "U_Descripcion", "U_Campo"
       FROM ${this.DB}
       WHERE "U_IdCampo" = ?`,
      [id],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  async create(data: { descripcion: string; campo: string }): Promise<RendCmp> {
    const mutex = getTableMutex('REND_CMP');

    return mutex.runExclusive(async () => {
      const idRows = await this.db.query<any>(
        `SELECT COALESCE(MAX("U_IdCampo"), 0) + 1 AS "newId" FROM ${this.DB}`,
      );
      const newId = Number(this.db.col(idRows[0], 'newId')) || 1;

      await this.db.execute(
        `INSERT INTO ${this.DB} ("U_IdCampo", "U_Descripcion", "U_Campo")
         VALUES (?, ?, ?)`,
        [newId, data.descripcion, data.campo],
      );

      return this.findOne(newId);
    });
  }

  async update(id: number, data: { descripcion?: string; campo?: string }): Promise<RendCmp | null> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (data.descripcion !== undefined) { setParts.push('"U_Descripcion" = ?'); params.push(data.descripcion); }
    if (data.campo       !== undefined) { setParts.push('"U_Campo" = ?');       params.push(data.campo); }

    if (!setParts.length) return this.findOne(id);

    params.push(id);
    await this.db.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_IdCampo" = ?`,
      params,
    );

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdCampo" = ?`,
      [id],
    );
    return { affected };
  }
}