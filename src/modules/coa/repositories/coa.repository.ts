import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "@database/interfaces/database.interface";
import { ICoaRepository } from "./coa.repository.interface";
import { CuentaCOA, CoaFiltro } from "../interfaces/coa.interface";
import { CrearCuentaDto, ActualizarCuentaDto } from "../dto/coa.dto";
import { tbl } from "@database/db-table.helper";

@Injectable()
export class CoaRepository implements ICoaRepository {
  private get schema(): string {
    return this.config.get<string>("hana.schema");
  }

  private get dbType(): string {
    return this.config.get<string>("app.dbType", "HANA").toUpperCase();
  }

  private get DB(): string {
    return tbl(this.schema, "REND_COA", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza una fila de base de datos a la interfaz CuentaCOA
   */
  private normalize(row: Record<string, unknown>): CuentaCOA {
    return {
      code: String(this.db.col(row, "COA_CODE") ?? ""),
      name: String(this.db.col(row, "COA_NAME") ?? ""),
      formatCode: String(this.db.col(row, "COA_FORMAT_CODE") ?? ""),
      asociada: (this.db.col(row, "COA_ASOCIADA") ?? "N") === "Y",
      activa: (this.db.col(row, "COA_ACTIVA") ?? "Y") === "Y",
    };
  }

  /**
   * Construye la cláusula WHERE según los filtros
   */
  private buildWhereClause(filtro?: CoaFiltro): {
    clause: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filtro?.code) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"COA_CODE" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"COA_CODE" LIKE ?`);
      }
      params.push(`%${filtro.code}%`);
    }

    if (filtro?.name) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"COA_NAME" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"COA_NAME" LIKE ?`);
      }
      params.push(`%${filtro.name}%`);
    }

    if (filtro?.activa !== undefined) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"COA_ACTIVA" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"COA_ACTIVA" = ?`);
      }
      params.push(filtro.activa ? "Y" : "N");
    }

    const clause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { clause, params };
  }

  /**
   * Construye la cláusula ORDER BY según los parámetros de ordenamiento
   */
  private buildOrderByClause(
    sortBy: string = "code",
    sortOrder: "asc" | "desc" = "asc",
  ): string {
    const columnMap: Record<string, string> = {
      code: '"COA_CODE"',
      name: '"COA_NAME"',
      activa: '"COA_ACTIVA"',
    };

    const column = columnMap[sortBy] || '"COA_CODE"';
    return `ORDER BY ${column} ${sortOrder.toUpperCase()}`;
  }

  async findAll(filtro?: CoaFiltro): Promise<CuentaCOA[]> {
    try {
      const { clause, params } = this.buildWhereClause(filtro);
      const orderBy = this.buildOrderByClause(
        filtro?.sortBy,
        filtro?.sortOrder,
      );

      const sql = `SELECT "COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA", "COA_ACTIVA" FROM ${this.DB} ${clause} ${orderBy}`;
      const rows = await this.db.query(sql, params);

      return rows.map((r) => this.normalize(r));
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `Error al consultar cuentas: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findByCode(code: string): Promise<CuentaCOA | null> {
    try {
      const placeholder = this.dbType === "POSTGRES" ? "$1" : "?";
      const sql = `SELECT "COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA", "COA_ACTIVA" FROM ${this.DB} WHERE "COA_CODE" = ${placeholder}`;
      const rows = await this.db.query(sql, [code]);

      return rows[0] ? this.normalize(rows[0]) : null;
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `Error al buscar cuenta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async exists(code: string): Promise<boolean> {
    const cuenta = await this.findByCode(code);
    return cuenta !== null;
  }

  async create(dto: CrearCuentaDto): Promise<CuentaCOA> {
    try {
      // Verificar si ya existe
      const exists = await this.findByCode(dto.code);
      if (exists) {
        throw new ConflictException(
          `Ya existe una cuenta con el código '${dto.code}'`,
        );
      }

      const code = dto.code.trim().toUpperCase();
      const name = dto.name.trim();
      const formatCode = dto.formatCode?.trim() ?? code;
      const asociada = dto.asociada ? "Y" : "N";
      const activa = dto.activa !== false ? "Y" : "N";

      if (this.dbType === "POSTGRES") {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA", "COA_ACTIVA") VALUES ($1, $2, $3, $4, $5)`,
          [code, name, formatCode, asociada, activa],
        );
      } else {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA", "COA_ACTIVA") VALUES (?, ?, ?, ?, ?)`,
          [code, name, formatCode, asociada, activa],
        );
      }

      return {
        code,
        name,
        formatCode,
        asociada: dto.asociada ?? false,
        activa: dto.activa !== false,
      };
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al crear cuenta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async update(code: string, dto: ActualizarCuentaDto): Promise<CuentaCOA> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(
          `Cuenta con código '${code}' no encontrada`,
        );
      }

      const parts: string[] = [];
      const params: unknown[] = [];

      if (dto.name !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"COA_NAME" = $${parts.length + 1}`);
        } else {
          parts.push(`"COA_NAME" = ?`);
        }
        params.push(dto.name.trim());
      }

      if (dto.formatCode !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"COA_FORMAT_CODE" = $${parts.length + 1}`);
        } else {
          parts.push(`"COA_FORMAT_CODE" = ?`);
        }
        params.push(dto.formatCode.trim());
      }

      if (dto.asociada !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"COA_ASOCIADA" = $${parts.length + 1}`);
        } else {
          parts.push(`"COA_ASOCIADA" = ?`);
        }
        params.push(dto.asociada ? "Y" : "N");
      }

      if (dto.activa !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"COA_ACTIVA" = $${parts.length + 1}`);
        } else {
          parts.push(`"COA_ACTIVA" = ?`);
        }
        params.push(dto.activa ? "Y" : "N");
      }

      if (parts.length === 0) {
        return existing; // No hay cambios
      }

      params.push(code);

      if (this.dbType === "POSTGRES") {
        const placeholder = `$${parts.length}`;
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(", ")} WHERE "COA_CODE" = ${placeholder}`,
          params,
        );
      } else {
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(", ")} WHERE "COA_CODE" = ?`,
          params,
        );
      }

      return {
        code,
        name: dto.name ?? existing.name,
        formatCode: dto.formatCode ?? existing.formatCode,
        asociada: dto.asociada ?? existing.asociada,
        activa: dto.activa ?? existing.activa,
      };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al actualizar cuenta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async remove(code: string): Promise<{ affected: number }> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(
          `Cuenta con código '${code}' no encontrada`,
        );
      }

      const placeholder = this.dbType === "POSTGRES" ? "$1" : "?";
      const result = await this.db.execute(
        `DELETE FROM ${this.DB} WHERE "COA_CODE" = ${placeholder}`,
        [code],
      );

      return { affected: result ?? 1 };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al eliminar cuenta: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
