import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "@database/interfaces/database.interface";
import { IProvRepository } from "./prov.repository.interface";
import { Prov } from "../interfaces/prov.interface";
import { CreateProvDto } from "../dto/create-prov.dto";
import { tbl } from "@database/db-table.helper";

@Injectable()
export class ProvHanaRepository implements IProvRepository {
  private get schema(): string {
    return this.config.get<string>("hana.schema");
  }
  private get dbType(): string {
    return this.config.get<string>("app.dbType", "HANA").toUpperCase();
  }
  private get DB(): string {
    return tbl(this.schema, "REND_PROV", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── Detección de columnas disponibles ──────────────────────────────────
  // La tabla REND_PROV puede tener 2 columnas (U_NIT, U_RAZON_SOCIAL)
  // o 4 columnas (+ U_CODIGO, U_TIPO) dependiendo del schema/ambiente.
  // Detectamos en runtime cuáles existen para compatibilidad entre ambientes.

  private _hasCodigo: boolean | null = null;

  private async hasCodigo(): Promise<boolean> {
    if (this._hasCodigo !== null) return this._hasCodigo;
    try {
      await this.db.query(`SELECT "U_CODIGO" FROM ${this.DB} WHERE 1=0`);
      this._hasCodigo = true;
    } catch {
      this._hasCodigo = false;
    }
    return this._hasCodigo;
  }

  private normalize(row: Record<string, any>, withCodigo: boolean): Prov {
    return {
      U_CODIGO: withCodigo ? String(this.db.col(row, "U_CODIGO") ?? "") : "",
      U_NIT: String(this.db.col(row, "U_NIT") ?? ""),
      U_RAZON_SOCIAL: String(this.db.col(row, "U_RAZON_SOCIAL") ?? ""),
      U_TIPO: withCodigo ? String(this.db.col(row, "U_TIPO") ?? "") : "",
    };
  }

  // ── Consultas ──────────────────────────────────────────────────────────

  async findAll(tipo?: string): Promise<Prov[]> {
    const wc = await this.hasCodigo();
    const cols = wc
      ? `"U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"`
      : `"U_NIT", "U_RAZON_SOCIAL"`;

    let rows: Record<string, any>[];
    if (wc && tipo) {
      rows = await this.db.query(
        `SELECT ${cols} FROM ${this.DB} WHERE "U_TIPO" = ? ORDER BY "U_RAZON_SOCIAL"`,
        [tipo],
      );
    } else {
      const order = wc
        ? `ORDER BY "U_TIPO", "U_RAZON_SOCIAL"`
        : `ORDER BY "U_RAZON_SOCIAL"`;
      rows = await this.db.query(`SELECT ${cols} FROM ${this.DB} ${order}`);
    }
    return rows.map((r) => this.normalize(r, wc));
  }

  async findByCodigo(codigo: string): Promise<Prov | null> {
    const wc = await this.hasCodigo();
    if (!wc) return null; // tabla sin U_CODIGO — búsqueda por código no aplica
    const rows = await this.db.query(
      `SELECT "U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO" FROM ${this.DB} WHERE "U_CODIGO" = ?`,
      [codigo],
    );
    return rows[0] ? this.normalize(rows[0], true) : null;
  }

  async findByNit(nit: string): Promise<Prov | null> {
    const wc = await this.hasCodigo();
    const cols = wc
      ? `"U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO"`
      : `"U_NIT", "U_RAZON_SOCIAL"`;
    const rows = await this.db.query(
      `SELECT ${cols} FROM ${this.DB} WHERE "U_NIT" = ?`,
      [nit],
    );
    return rows[0] ? this.normalize(rows?.[0], wc) : null;
  }

  async getNextCodigo(tipo: string): Promise<string> {
    const wc = await this.hasCodigo();
    if (!wc) return ""; // tabla sin U_CODIGO — no genera código secuencial

    const prefix = tipo.toUpperCase();

    if (this.dbType === "POSTGRES") {
      const row = await this.db.queryOne(
        `SELECT rend_retail.next_prov_codigo($1::varchar) AS "NEXT_CODIGO"`,
        [prefix],
      );
      return this.db.col(row, "NEXT_CODIGO");
    }

    const rows = await this.db.query(
      `SELECT "U_CODIGO" FROM ${this.DB} WHERE "U_CODIGO" LIKE ? ORDER BY "U_CODIGO" DESC`,
      [`${prefix}%`],
    );
    let maxNum = 0;
    for (const r of rows) {
      const num = parseInt(
        (this.db.col(r, "U_CODIGO") as string).substring(2),
        10,
      );
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
    return `${prefix}${String(maxNum + 1).padStart(5, "0")}`;
  }

  // ── Mutaciones ─────────────────────────────────────────────────────────

  async create(dto: CreateProvDto): Promise<Prov> {
    const wc = await this.hasCodigo();

    if (wc) {
      // Schema completo: 4 columnas
      const codigo = await this.getNextCodigo(dto.tipo);
      await this.db.execute(
        `INSERT INTO ${this.DB} ("U_CODIGO", "U_NIT", "U_RAZON_SOCIAL", "U_TIPO") VALUES (?, ?, ?, ?)`,
        [codigo, dto.nit, dto.razonSocial, dto.tipo],
      );
      return {
        U_CODIGO: codigo,
        U_NIT: dto.nit,
        U_RAZON_SOCIAL: dto.razonSocial,
        U_TIPO: dto.tipo,
      };
    } else {
      // Schema reducido QA2: solo U_NIT y U_RAZON_SOCIAL
      await this.db.execute(
        `INSERT INTO ${this.DB} ("U_NIT", "U_RAZON_SOCIAL") VALUES (?, ?)`,
        [dto.nit, dto.razonSocial],
      );
      return {
        U_CODIGO: "",
        U_NIT: dto.nit,
        U_RAZON_SOCIAL: dto.razonSocial,
        U_TIPO: dto.tipo,
      };
    }
  }

  async updateByCodigo(
    codigo: string,
    data: { nit?: string; razonSocial?: string },
  ): Promise<{ affected: number }> {
    const wc = await this.hasCodigo();
    if (!wc) return { affected: 0 };

    const parts: string[] = [];
    const params: unknown[] = [];
    if (data.razonSocial !== undefined) {
      parts.push('"U_RAZON_SOCIAL" = ?');
      params.push(data.razonSocial);
    }
    if (data.nit !== undefined) {
      parts.push('"U_NIT" = ?');
      params.push(data.nit);
    }
    if (!parts.length) return { affected: 0 };

    params.push(codigo);
    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${parts.join(", ")} WHERE "U_CODIGO" = ?`,
      params,
    );
    return { affected };
  }

  async remove(nit: string): Promise<{ affected: number }> {
    // Eliminar por NIT — funciona con ambas estructuras de tabla
    const result = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_NIT" = ?`,
      [nit],
    );
    return { affected: result ?? 1 };
  }
}
