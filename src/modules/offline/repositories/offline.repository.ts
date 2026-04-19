import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "@database/interfaces/database.interface";
import { tbl } from "@database/db-table.helper";
import { IOfflineRepository } from "./offline.repository.interface";
import {
  CreateCuentaCOADto,
  UpdateCuentaCOADto,
  CreateDimensionDto,
  UpdateDimensionDto,
  CreateNormaDto,
  UpdateNormaDto,
} from "../dto/offline.dto";

@Injectable()
export class OfflineRepository implements IOfflineRepository {
  private get schema(): string {
    return this.config.get<string>("hana.schema");
  }
  private get dbType(): string {
    return this.config.get<string>("app.dbType", "HANA").toUpperCase();
  }

  private get COA(): string {
    return tbl(this.schema, "REND_COA", this.dbType);
  }
  private get DIM(): string {
    return tbl(this.schema, "REND_DIMENSIONES", this.dbType);
  }
  private get NR(): string {
    return tbl(this.schema, "REND_NORMAS", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ── REND_COA ────────────────────────────────────────────────────────────────

  async findAllCuentas(): Promise<any[]> {
    return this.db.query(
      `SELECT "COA_CODE","COA_NAME","COA_FORMAT_CODE","COA_ASOCIADA","COA_ACTIVA"
       FROM ${this.COA} ORDER BY "COA_CODE"`,
    );
  }

  async findCuentaByCode(code: string): Promise<any | null> {
    return this.db.queryOne(
      `SELECT "COA_CODE" FROM ${this.COA} WHERE "COA_CODE" = ?`,
      [code],
    );
  }

  async createCuenta(dto: CreateCuentaCOADto): Promise<void> {
    await this.db.execute(
      `INSERT INTO ${this.COA} ("COA_CODE","COA_NAME","COA_FORMAT_CODE","COA_ASOCIADA","COA_ACTIVA")
       VALUES (?,?,?,?,?)`,
      [
        dto.COA_CODE,
        dto.COA_NAME,
        dto.COA_FORMAT_CODE ?? "",
        dto.COA_ASOCIADA ?? "N",
        dto.COA_ACTIVA ?? "Y",
      ],
    );
  }

  async updateCuenta(code: string, dto: UpdateCuentaCOADto): Promise<number> {
    const parts: string[] = [];
    const params: any[] = [];
    if (dto.COA_NAME !== undefined) {
      parts.push('"COA_NAME" = ?');
      params.push(dto.COA_NAME);
    }
    if (dto.COA_FORMAT_CODE !== undefined) {
      parts.push('"COA_FORMAT_CODE" = ?');
      params.push(dto.COA_FORMAT_CODE);
    }
    if (dto.COA_ASOCIADA !== undefined) {
      parts.push('"COA_ASOCIADA" = ?');
      params.push(dto.COA_ASOCIADA);
    }
    if (dto.COA_ACTIVA !== undefined) {
      parts.push('"COA_ACTIVA" = ?');
      params.push(dto.COA_ACTIVA);
    }
    if (!parts.length) return 0;
    params.push(code);
    return this.db.execute(
      `UPDATE ${this.COA} SET ${parts.join(",")} WHERE "COA_CODE" = ?`,
      params,
    );
  }

  async deleteCuenta(code: string): Promise<number> {
    return this.db.execute(`DELETE FROM ${this.COA} WHERE "COA_CODE" = ?`, [
      code,
    ]);
  }

  // ── REND_DIMENSIONES ────────────────────────────────────────────────────────

  async findAllDimensiones(): Promise<any[]> {
    return this.db.query(
      `SELECT "DIM_CODE","DIM_NAME","DIM_DESCRIPCION","DIM_ACTIVA"
       FROM ${this.DIM} ORDER BY "DIM_CODE"`,
    );
  }

  async findDimensionByCode(code: number): Promise<any | null> {
    return this.db.queryOne(
      `SELECT "DIM_CODE" FROM ${this.DIM} WHERE "DIM_CODE" = ?`,
      [code],
    );
  }

  async createDimension(dto: CreateDimensionDto): Promise<void> {
    await this.db.execute(
      `INSERT INTO ${this.DIM} ("DIM_CODE","DIM_NAME","DIM_DESCRIPCION","DIM_ACTIVA") VALUES (?,?,?,?)`,
      [
        dto.DIM_CODE,
        dto.DIM_NAME,
        dto.DIM_DESCRIPCION ?? "",
        dto.DIM_ACTIVA ?? "Y",
      ],
    );
  }

  async updateDimension(
    code: number,
    dto: UpdateDimensionDto,
  ): Promise<number> {
    const parts: string[] = [];
    const params: any[] = [];
    if (dto.DIM_NAME !== undefined) {
      parts.push('"DIM_NAME" = ?');
      params.push(dto.DIM_NAME);
    }
    if (dto.DIM_DESCRIPCION !== undefined) {
      parts.push('"DIM_DESCRIPCION" = ?');
      params.push(dto.DIM_DESCRIPCION);
    }
    if (dto.DIM_ACTIVA !== undefined) {
      parts.push('"DIM_ACTIVA" = ?');
      params.push(dto.DIM_ACTIVA);
    }
    if (!parts.length) return 0;
    params.push(code);
    return this.db.execute(
      `UPDATE ${this.DIM} SET ${parts.join(",")} WHERE "DIM_CODE" = ?`,
      params,
    );
  }

  async deleteDimension(code: number): Promise<number> {
    return this.db.execute(`DELETE FROM ${this.DIM} WHERE "DIM_CODE" = ?`, [
      code,
    ]);
  }

  // ── REND_NORMAS ─────────────────────────────────────────────────────────────

  async findAllNormas(): Promise<any[]> {
    return this.db.query(
      `SELECT n."NR_FACTOR_CODE", n."NR_DESCRIPCION", n."NR_DIMENSION", n."NR_ACTIVA",
              d."DIM_NAME"
       FROM ${this.NR} n
       LEFT JOIN ${this.DIM} d ON d."DIM_CODE" = n."NR_DIMENSION"
       ORDER BY n."NR_DIMENSION", n."NR_FACTOR_CODE"`,
    );
  }

  async findNormaByCode(code: string): Promise<any | null> {
    return this.db.queryOne(
      `SELECT "NR_FACTOR_CODE" FROM ${this.NR} WHERE "NR_FACTOR_CODE" = ?`,
      [code],
    );
  }

  async createNorma(dto: CreateNormaDto): Promise<void> {
    await this.db.execute(
      `INSERT INTO ${this.NR} ("NR_FACTOR_CODE","NR_DESCRIPCION","NR_DIMENSION","NR_ACTIVA") VALUES (?,?,?,?)`,
      [
        dto.NR_FACTOR_CODE,
        dto.NR_DESCRIPCION,
        dto.NR_DIMENSION,
        dto.NR_ACTIVA ?? "Y",
      ],
    );
  }

  async updateNorma(code: string, dto: UpdateNormaDto): Promise<number> {
    const parts: string[] = [];
    const params: any[] = [];
    if (dto.NR_DESCRIPCION !== undefined) {
      parts.push('"NR_DESCRIPCION" = ?');
      params.push(dto.NR_DESCRIPCION);
    }
    if (dto.NR_DIMENSION !== undefined) {
      parts.push('"NR_DIMENSION" = ?');
      params.push(dto.NR_DIMENSION);
    }
    if (dto.NR_ACTIVA !== undefined) {
      parts.push('"NR_ACTIVA" = ?');
      params.push(dto.NR_ACTIVA);
    }
    if (!parts.length) return 0;
    params.push(code);
    return this.db.execute(
      `UPDATE ${this.NR} SET ${parts.join(",")} WHERE "NR_FACTOR_CODE" = ?`,
      params,
    );
  }

  async deleteNorma(code: string): Promise<number> {
    return this.db.execute(
      `DELETE FROM ${this.NR} WHERE "NR_FACTOR_CODE" = ?`,
      [code],
    );
  }
}
