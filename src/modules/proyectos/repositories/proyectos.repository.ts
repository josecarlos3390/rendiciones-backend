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
import { IProyectosRepository } from "./proyectos.repository.interface";
import { Proyecto, ProyectoFiltro } from "../interfaces/proyecto.interface";
import { CrearProyectoDto, ActualizarProyectoDto } from "../dto/proyecto.dto";
import { tbl } from "@database/db-table.helper";

@Injectable()
export class ProyectosRepository implements IProyectosRepository {
  private get schema(): string {
    return this.config.get<string>("hana.schema");
  }

  private get dbType(): string {
    return this.config.get<string>("app.dbType", "HANA").toUpperCase();
  }

  private get DB(): string {
    return tbl(this.schema, "REND_PROYECTOS", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza una fila de base de datos a la interfaz Proyecto
   */
  private normalize(row: Record<string, unknown>): Proyecto {
    return {
      code: String(this.db.col(row, "PROY_CODE") ?? ""),
      name: String(this.db.col(row, "PROY_NAME") ?? ""),
      activo: (this.db.col(row, "PROY_ACTIVO") ?? "Y") === "Y",
    };
  }

  /**
   * Construye la cláusula WHERE según los filtros
   */
  private buildWhereClause(filtro?: ProyectoFiltro): {
    clause: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filtro?.code) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"PROY_CODE" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"PROY_CODE" LIKE ?`);
      }
      params.push(`%${filtro.code}%`);
    }

    if (filtro?.name) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"PROY_NAME" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"PROY_NAME" LIKE ?`);
      }
      params.push(`%${filtro.name}%`);
    }

    if (filtro?.activo !== undefined) {
      if (this.dbType === "POSTGRES") {
        conditions.push(`"PROY_ACTIVO" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"PROY_ACTIVO" = ?`);
      }
      params.push(filtro.activo ? "Y" : "N");
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
      code: '"PROY_CODE"',
      name: '"PROY_NAME"',
      activo: '"PROY_ACTIVO"',
    };

    const column = columnMap[sortBy] || '"PROY_CODE"';
    return `ORDER BY ${column} ${sortOrder.toUpperCase()}`;
  }

  async findAll(filtro?: ProyectoFiltro): Promise<Proyecto[]> {
    try {
      const { clause, params } = this.buildWhereClause(filtro);
      const orderBy = this.buildOrderByClause(
        filtro?.sortBy,
        filtro?.sortOrder,
      );

      const sql = `SELECT "PROY_CODE", "PROY_NAME", "PROY_ACTIVO" FROM ${this.DB} ${clause} ${orderBy}`;
      const rows = await this.db.query(sql, params);

      return rows.map((r) => this.normalize(r));
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `Error al consultar proyectos: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findByCode(code: string): Promise<Proyecto | null> {
    try {
      const placeholder = this.dbType === "POSTGRES" ? "$1" : "?";
      const sql = `SELECT "PROY_CODE", "PROY_NAME", "PROY_ACTIVO" FROM ${this.DB} WHERE "PROY_CODE" = ${placeholder}`;
      const rows = await this.db.query(sql, [code]);

      return rows[0] ? this.normalize(rows[0]) : null;
    } catch (err: unknown) {
      throw new InternalServerErrorException(
        `Error al buscar proyecto: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async exists(code: string): Promise<boolean> {
    const proyecto = await this.findByCode(code);
    return proyecto !== null;
  }

  async create(dto: CrearProyectoDto): Promise<Proyecto> {
    try {
      // Verificar si ya existe
      const exists = await this.findByCode(dto.code);
      if (exists) {
        throw new ConflictException(
          `Ya existe un proyecto con el código '${dto.code}'`,
        );
      }

      const activo = dto.activo !== false ? "Y" : "N";

      if (this.dbType === "POSTGRES") {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("PROY_CODE", "PROY_NAME", "PROY_ACTIVO") VALUES ($1, $2, $3)`,
          [dto.code, dto.name, activo],
        );
      } else {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("PROY_CODE", "PROY_NAME", "PROY_ACTIVO") VALUES (?, ?, ?)`,
          [dto.code, dto.name, activo],
        );
      }

      return {
        code: dto.code,
        name: dto.name,
        activo: dto.activo !== false,
      };
    } catch (err: unknown) {
      if (err instanceof ConflictException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al crear proyecto: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async update(code: string, dto: ActualizarProyectoDto): Promise<Proyecto> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(
          `Proyecto con código '${code}' no encontrado`,
        );
      }

      const parts: string[] = [];
      const params: unknown[] = [];

      if (dto.name !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"PROY_NAME" = $${parts.length + 1}`);
        } else {
          parts.push(`"PROY_NAME" = ?`);
        }
        params.push(dto.name);
      }

      if (dto.activo !== undefined) {
        if (this.dbType === "POSTGRES") {
          parts.push(`"PROY_ACTIVO" = $${parts.length + 1}`);
        } else {
          parts.push(`"PROY_ACTIVO" = ?`);
        }
        params.push(dto.activo ? "Y" : "N");
      }

      if (parts.length === 0) {
        return existing; // No hay cambios
      }

      params.push(code);

      if (this.dbType === "POSTGRES") {
        const placeholder = `$${parts.length}`;
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(", ")} WHERE "PROY_CODE" = ${placeholder}`,
          params,
        );
      } else {
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(", ")} WHERE "PROY_CODE" = ?`,
          params,
        );
      }

      return {
        code,
        name: dto.name ?? existing.name,
        activo: dto.activo ?? existing.activo,
      };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al actualizar proyecto: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async remove(code: string): Promise<{ affected: number }> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(
          `Proyecto con código '${code}' no encontrado`,
        );
      }

      const placeholder = this.dbType === "POSTGRES" ? "$1" : "?";
      const result = await this.db.execute(
        `DELETE FROM ${this.DB} WHERE "PROY_CODE" = ${placeholder}`,
        [code],
      );

      return { affected: result ?? 1 };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al eliminar proyecto: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
