import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "../../../database/interfaces/database.interface";
import { tbl } from "../../../database/db-table.helper";
import {
  IRendCmpRepository,
  RendCmp,
  SapFieldMapping,
} from "./rend-cmp.repository.interface";
import { getTableMutex } from "../../../common/utils/db-mutex";

@Injectable()
export class RendCmpHanaRepository implements IRendCmpRepository {
  private get schema(): string {
    return this.configService.get<string>("hana.schema");
  }
  private get dbType(): string {
    return this.configService.get<string>("app.dbType", "HANA").toUpperCase();
  }
  private get DB(): string {
    return tbl(this.schema, "REND_CMP", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private normalize(row: Record<string, any>): RendCmp {
    const col = (name: string) => this.db.col(row, name);
    return {
      U_IdCampo: Number(col("U_IdCampo")),
      U_Descripcion: String(col("U_Descripcion") ?? ""),
      U_Campo: String(col("U_Campo") ?? ""),
    };
  }

  async findAll(): Promise<RendCmp[]> {
    const rows = await this.db.query(
      `SELECT "U_IdCampo", "U_Descripcion", "U_Campo"
       FROM ${this.DB}
       ORDER BY "U_IdCampo" ASC`,
    );
    return rows.map((r) => this.normalize(r));
  }

  async findOne(id: number): Promise<RendCmp | null> {
    const rows = await this.db.query(
      `SELECT "U_IdCampo", "U_Descripcion", "U_Campo"
       FROM ${this.DB}
       WHERE "U_IdCampo" = ?`,
      [id],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  async create(data: { descripcion: string; campo: string }): Promise<RendCmp> {
    const mutex = getTableMutex("REND_CMP");

    return mutex.runExclusive(async () => {
      const idRows = await this.db.query(
        `SELECT COALESCE(MAX("U_IdCampo"), 0) + 1 AS "newId" FROM ${this.DB}`,
      );
      const newId = Number(this.db.col(idRows[0], "newId")) || 1;

      await this.db.execute(
        `INSERT INTO ${this.DB} ("U_IdCampo", "U_Descripcion", "U_Campo")
         VALUES (?, ?, ?)`,
        [newId, data.descripcion, data.campo],
      );

      return this.findOne(newId);
    });
  }

  async update(
    id: number,
    data: { descripcion?: string; campo?: string },
  ): Promise<RendCmp | null> {
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (data.descripcion !== undefined) {
      setParts.push('"U_Descripcion" = ?');
      params.push(data.descripcion);
    }
    if (data.campo !== undefined) {
      setParts.push('"U_Campo" = ?');
      params.push(data.campo);
    }

    if (!setParts.length) return this.findOne(id);

    params.push(id);
    await this.db.execute(
      `UPDATE ${this.DB} SET ${setParts.join(", ")} WHERE "U_IdCampo" = ?`,
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

  async getFieldMapping(): Promise<SapFieldMapping> {
    const rows = await this.db.query(
      `SELECT "U_IdCampo", "U_Campo" FROM ${this.DB} ORDER BY "U_IdCampo" ASC`,
    );

    // Fallback: mapeo por defecto con los nombres más comunes
    const mapping: SapFieldMapping = {
      1: "U_TIPODOC", // Tipo de Documento
      2: "U_CODFORPI", // Codi Formulario Poliza
      3: "U_FECHAFAC", // Fecha Factura
      4: "U_NROTRAM", // Numero Tramite
      5: "U_NUMPOL", // Numero Poliza
      6: "U_NIT", // NIT
      7: "U_CARDNAME", // Razon Social (nombre común)
      8: "U_IMPORTE", // Importe
      9: "U_CODALFA", // Codi de Control
      10: "U_ICE", // Ice
      11: "U_EXENTO", // Exento
      12: "U_NumAuto", // Numero de Autorizacion
      13: "U_BOLBSP", // Boleto BSP
      14: "U_NumDoc", // Numero de Factura
      15: "U_DESCTOBR", // Descuento BR
      16: "U_TASACERO", // Tasa Cero
      17: "U_TASAS", // Tasa
      18: "U_B_cuf", // Codigo unico factura
      19: "U_GIFTCARD", // gift card
      20: "U_RCIVA", // RCIVA
      // Campos adicionales comunes
      100: "U_TASAS", // Tasa (alternativo)
      101: "U_B_cuf", // CUF (alternativo)
      102: "U_GIFTCARD", // Gift card (alternativo)
    };

    // Actualizar con los valores reales de la BD
    for (const row of rows) {
      const idCampo = Number(this.db.col(row, "U_IdCampo"));
      const campo = String(this.db.col(row, "U_Campo") ?? "");

      if (!campo) continue;

      // Asegurar que el campo tenga prefijo U_ si no lo tiene
      const campoSap = campo.startsWith("U_") ? campo : `U_${campo}`;
      mapping[idCampo] = campoSap;
    }

    return mapping;
  }
}
