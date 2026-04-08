import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '@database/interfaces/database.interface';
import { IDimensionesRepository } from './dimensiones.repository.interface';
import { Dimension, DimensionFiltro } from '../interfaces/dimension.interface';
import { CrearDimensionDto, ActualizarDimensionDto } from '../dto/dimension.dto';
import { tbl } from '@database/db-table.helper';

@Injectable()
export class DimensionesRepository implements IDimensionesRepository {
  private get schema(): string {
    return this.config.get<string>('hana.schema');
  }

  private get dbType(): string {
    return this.config.get<string>('app.dbType', 'HANA').toUpperCase();
  }

  private get DB(): string {
    return tbl(this.schema, 'REND_DIMENSIONES', this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza una fila de base de datos a la interfaz Dimension
   */
  private normalize(row: any): Dimension {
    return {
      code: Number(this.db.col(row, 'DIM_CODE') ?? 0),
      name: String(this.db.col(row, 'DIM_NAME') ?? ''),
      descripcion: String(this.db.col(row, 'DIM_DESCRIPCION') ?? ''),
      activa: (this.db.col(row, 'DIM_ACTIVA') ?? 'Y') === 'Y',
    };
  }

  /**
   * Construye la cláusula WHERE según los filtros
   */
  private buildWhereClause(
    filtro?: DimensionFiltro,
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtro?.code !== undefined) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"DIM_CODE" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"DIM_CODE" = ?`);
      }
      params.push(filtro.code);
    }

    if (filtro?.name) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"DIM_NAME" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"DIM_NAME" LIKE ?`);
      }
      params.push(`%${filtro.name}%`);
    }

    if (filtro?.activa !== undefined) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"DIM_ACTIVA" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"DIM_ACTIVA" = ?`);
      }
      params.push(filtro.activa ? 'Y' : 'N');
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  /**
   * Construye la cláusula ORDER BY
   */
  private buildOrderByClause(
    sortBy: string = 'code',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): string {
    const columnMap: Record<string, string> = {
      code: '"DIM_CODE"',
      name: '"DIM_NAME"',
      activa: '"DIM_ACTIVA"',
    };

    const column = columnMap[sortBy] || '"DIM_CODE"';
    return `ORDER BY ${column} ${sortOrder.toUpperCase()}`;
  }

  async findAll(filtro?: DimensionFiltro): Promise<Dimension[]> {
    try {
      const { clause, params } = this.buildWhereClause(filtro);
      const orderBy = this.buildOrderByClause(filtro?.sortBy, filtro?.sortOrder);

      const sql = `SELECT "DIM_CODE", "DIM_NAME", "DIM_DESCRIPCION", "DIM_ACTIVA" FROM ${this.DB} ${clause} ${orderBy}`;
      const rows = await this.db.query<any>(sql, params);

      return rows.map((r) => this.normalize(r));
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al consultar dimensiones: ${err.message}`,
      );
    }
  }

  async findByCode(code: number): Promise<Dimension | null> {
    try {
      const placeholder = this.dbType === 'POSTGRES' ? '$1' : '?';
      const sql = `SELECT "DIM_CODE", "DIM_NAME", "DIM_DESCRIPCION", "DIM_ACTIVA" FROM ${this.DB} WHERE "DIM_CODE" = ${placeholder}`;
      const rows = await this.db.query<any>(sql, [code]);

      return rows[0] ? this.normalize(rows[0]) : null;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al buscar dimensión: ${err.message}`,
      );
    }
  }

  async exists(code: number): Promise<boolean> {
    const dimension = await this.findByCode(code);
    return dimension !== null;
  }

  async create(dto: CrearDimensionDto): Promise<Dimension> {
    try {
      // Verificar si ya existe
      const exists = await this.findByCode(dto.code);
      if (exists) {
        throw new ConflictException(
          `Ya existe una dimensión con el código ${dto.code}`,
        );
      }

      const name = dto.name.trim();
      const descripcion = dto.descripcion?.trim() ?? '';
      const activa = dto.activa !== false ? 'Y' : 'N';

      if (this.dbType === 'POSTGRES') {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("DIM_CODE", "DIM_NAME", "DIM_DESCRIPCION", "DIM_ACTIVA") VALUES ($1, $2, $3, $4)`,
          [dto.code, name, descripcion, activa],
        );
      } else {
        await this.db.execute(
          `INSERT INTO ${this.DB} ("DIM_CODE", "DIM_NAME", "DIM_DESCRIPCION", "DIM_ACTIVA") VALUES (?, ?, ?, ?)`,
          [dto.code, name, descripcion, activa],
        );
      }

      return {
        code: dto.code,
        name,
        descripcion,
        activa: dto.activa !== false,
      };
    } catch (err: any) {
      if (err instanceof ConflictException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al crear dimensión: ${err.message}`,
      );
    }
  }

  async update(code: number, dto: ActualizarDimensionDto): Promise<Dimension> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(`Dimensión con código ${code} no encontrada`);
      }

      const parts: string[] = [];
      const params: any[] = [];

      if (dto.name !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"DIM_NAME" = $${parts.length + 1}`);
        } else {
          parts.push(`"DIM_NAME" = ?`);
        }
        params.push(dto.name.trim());
      }

      if (dto.descripcion !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"DIM_DESCRIPCION" = $${parts.length + 1}`);
        } else {
          parts.push(`"DIM_DESCRIPCION" = ?`);
        }
        params.push(dto.descripcion.trim());
      }

      if (dto.activa !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"DIM_ACTIVA" = $${parts.length + 1}`);
        } else {
          parts.push(`"DIM_ACTIVA" = ?`);
        }
        params.push(dto.activa ? 'Y' : 'N');
      }

      if (parts.length === 0) {
        return existing; // No hay cambios
      }

      params.push(code);

      if (this.dbType === 'POSTGRES') {
        const placeholder = `$${parts.length}`;
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(', ')} WHERE "DIM_CODE" = ${placeholder}`,
          params,
        );
      } else {
        await this.db.execute(
          `UPDATE ${this.DB} SET ${parts.join(', ')} WHERE "DIM_CODE" = ?`,
          params,
        );
      }

      return {
        code,
        name: dto.name ?? existing.name,
        descripcion: dto.descripcion ?? existing.descripcion,
        activa: dto.activa ?? existing.activa,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al actualizar dimensión: ${err.message}`,
      );
    }
  }

  async remove(code: number): Promise<{ affected: number }> {
    try {
      // Verificar que existe
      const existing = await this.findByCode(code);
      if (!existing) {
        throw new NotFoundException(`Dimensión con código ${code} no encontrada`);
      }

      const placeholder = this.dbType === 'POSTGRES' ? '$1' : '?';
      const result = await this.db.execute(
        `DELETE FROM ${this.DB} WHERE "DIM_CODE" = ${placeholder}`,
        [code],
      );

      return { affected: result ?? 1 };
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al eliminar dimensión: ${err.message}`,
      );
    }
  }
}
