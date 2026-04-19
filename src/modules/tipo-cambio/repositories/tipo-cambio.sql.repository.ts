import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "../../../database/interfaces/database.interface";
import { ITipoCambioRepository } from "./tipo-cambio.repository.interface";
import {
  ITipoCambio,
  ITipoCambioFilter,
} from "../interfaces/tipo-cambio.interface";
import {
  CreateTipoCambioDto,
  UpdateTipoCambioDto,
} from "../dto/create-tipo-cambio.dto";
import { tbl } from "../../../database/db-table.helper";

/**
 * Implementación del repositorio de tipos de cambio para SQL Server/PostgreSQL
 * Usado en modo OFFLINE (sin SAP)
 */
@Injectable()
export class TipoCambioSqlRepository implements ITipoCambioRepository {
  private readonly logger = new Logger(TipoCambioSqlRepository.name);

  private get schema(): string {
    return this.config.get<string>("hana.schema", "rend_retail");
  }

  private get dbType(): string {
    return this.config.get<string>("app.dbType", "HANA").toUpperCase();
  }

  private get tableName(): string {
    return tbl(this.schema, "REND_TIPO_CAMBIO", this.dbType);
  }

  private get ph(): string {
    return this.dbType === "POSTGRES" ? "$" : "?";
  }

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  async findByFechaMoneda(
    fecha: string,
    moneda: string,
  ): Promise<number | null> {
    const sql = `
      SELECT "U_Tasa" 
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ${this.ph}1 
        AND "U_Moneda" = ${this.ph}2 
        AND "U_Activo" = 'Y'
    `;

    try {
      const result = await this.db.queryOne<{ u_tasa: number }>(sql, [
        fecha,
        moneda.toUpperCase(),
      ]);
      return result?.u_tasa ?? null;
    } catch (error) {
      this.logger.error(`Error al buscar tipo de cambio: ${error.message}`);
      return null;
    }
  }

  async findByFechaMonedaCompleto(
    fecha: string,
    moneda: string,
  ): Promise<ITipoCambio | null> {
    const sql = `
      SELECT "U_IdTipoCambio", "U_Fecha", "U_Moneda", "U_Tasa", "U_Activo"
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ${this.ph}1 
        AND "U_Moneda" = ${this.ph}2 
        AND "U_Activo" = 'Y'
    `;

    const result = await this.db.queryOne(sql, [fecha, moneda.toUpperCase()]);
    if (!result) return null;

    // Mapear de snake_case a camelCase
    return {
      U_IdTipoCambio: result.u_idtipocambio,
      U_Fecha: result.u_fecha,
      U_Moneda: result.u_moneda,
      U_Tasa: result.u_tasa,
      U_Activo: result.u_activo,
    };
  }

  async create(data: CreateTipoCambioDto): Promise<ITipoCambio> {
    // Verificar si ya existe
    const exists = await this.exists(data.fecha, data.moneda);
    if (exists) {
      throw new Error(
        `DUPLICATE: Ya existe un tipo de cambio para ${data.moneda} en fecha ${data.fecha}`,
      );
    }

    let sql: string;
    let params: unknown[];

    if (this.dbType === "POSTGRES") {
      sql = `
        INSERT INTO ${this.tableName} 
        ("U_Fecha", "U_Moneda", "U_Tasa", "U_Activo")
        VALUES ($1, $2, $3, $4)
        RETURNING "U_IdTipoCambio", "U_Fecha", "U_Moneda", "U_Tasa", "U_Activo"
      `;
      params = [
        data.fecha,
        data.moneda.toUpperCase(),
        data.tasa,
        data.activo ?? "Y",
      ];
    } else {
      // SQL Server
      sql = `
        INSERT INTO ${this.tableName} 
        ("U_Fecha", "U_Moneda", "U_Tasa", "U_Activo")
        OUTPUT INSERTED."U_IdTipoCambio", INSERTED."U_Fecha", INSERTED."U_Moneda", INSERTED."U_Tasa", INSERTED."U_Activo"
        VALUES (?, ?, ?, ?)
      `;
      params = [
        data.fecha,
        data.moneda.toUpperCase(),
        data.tasa,
        data.activo ?? "Y",
      ];
    }

    const result = await this.db.queryOne(sql, params);

    if (!result) {
      throw new Error("No se pudo crear el tipo de cambio");
    }

    return {
      U_IdTipoCambio: result.u_idtipocambio || result.U_IdTipoCambio,
      U_Fecha: result.u_fecha || result.U_Fecha,
      U_Moneda: result.u_moneda || result.U_Moneda,
      U_Tasa: result.u_tasa || result.U_Tasa,
      U_Activo: result.u_activo || result.U_Activo,
    };
  }

  async update(id: number, data: UpdateTipoCambioDto): Promise<ITipoCambio> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.fecha !== undefined) {
      fields.push(`"U_Fecha" = ${this.ph}${paramIndex++}`);
      values.push(data.fecha);
    }
    if (data.moneda !== undefined) {
      fields.push(`"U_Moneda" = ${this.ph}${paramIndex++}`);
      values.push(data.moneda.toUpperCase());
    }
    if (data.tasa !== undefined) {
      fields.push(`"U_Tasa" = ${this.ph}${paramIndex++}`);
      values.push(data.tasa);
    }
    if (data.activo !== undefined) {
      fields.push(`"U_Activo" = ${this.ph}${paramIndex++}`);
      values.push(data.activo);
    }

    if (fields.length === 0) {
      throw new Error("No hay campos para actualizar");
    }

    let sql: string;

    if (this.dbType === "POSTGRES") {
      sql = `
        UPDATE ${this.tableName} 
        SET ${fields.join(", ")} 
        WHERE "U_IdTipoCambio" = $${paramIndex}
        RETURNING "U_IdTipoCambio", "U_Fecha", "U_Moneda", "U_Tasa", "U_Activo"
      `;
    } else {
      // SQL Server
      sql = `
        UPDATE ${this.tableName} 
        SET ${fields.join(", ")} 
        OUTPUT INSERTED."U_IdTipoCambio", INSERTED."U_Fecha", INSERTED."U_Moneda", INSERTED."U_Tasa", INSERTED."U_Activo"
        WHERE "U_IdTipoCambio" = ?
      `;
    }
    values.push(id);

    const result = await this.db.queryOne(sql, values);
    if (!result) {
      throw new Error(`No se encontró el tipo de cambio con id ${id}`);
    }

    return {
      U_IdTipoCambio: result.u_idtipocambio || result.U_IdTipoCambio,
      U_Fecha: result.u_fecha || result.U_Fecha,
      U_Moneda: result.u_moneda || result.U_Moneda,
      U_Tasa: result.u_tasa || result.U_Tasa,
      U_Activo: result.u_activo || result.U_Activo,
    };
  }

  async findAll(filter?: ITipoCambioFilter): Promise<ITipoCambio[]> {
    let sql = `SELECT "U_IdTipoCambio", "U_Fecha", "U_Moneda", "U_Tasa", "U_Activo" FROM ${this.tableName} WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter?.fecha) {
      sql += ` AND "U_Fecha" = ${this.ph}${paramIndex++}`;
      params.push(filter.fecha);
    }
    if (filter?.moneda) {
      sql += ` AND "U_Moneda" = ${this.ph}${paramIndex++}`;
      params.push(filter.moneda.toUpperCase());
    }
    if (filter?.activo !== undefined) {
      sql += ` AND "U_Activo" = ${this.ph}${paramIndex++}`;
      params.push(filter.activo);
    }

    sql += ` ORDER BY "U_Fecha" DESC, "U_Moneda"`;

    const results = await this.db.query(sql, params);
    return results.map((r) => ({
      U_IdTipoCambio: r.u_idtipocambio || r.U_IdTipoCambio,
      U_Fecha: r.u_fecha || r.U_Fecha,
      U_Moneda: r.u_moneda || r.U_Moneda,
      U_Tasa: r.u_tasa || r.U_Tasa,
      U_Activo: r.u_activo || r.U_Activo,
    }));
  }

  async remove(id: number): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET "U_Activo" = 'N' WHERE "U_IdTipoCambio" = ${this.ph}1`;
    await this.db.execute(sql, [id]);
  }

  async exists(fecha: string, moneda: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE "U_Fecha" = ${this.ph}1 AND "U_Moneda" = ${this.ph}2
    `;
    const result = await this.db.queryOne<{ count: number }>(sql, [
      fecha,
      moneda.toUpperCase(),
    ]);
    return (result?.count ?? 0) > 0;
  }
}
