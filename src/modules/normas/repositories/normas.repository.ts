import {
  Injectable,
  Inject,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '@database/interfaces/database.interface';
import { INormasRepository } from './normas.repository.interface';
import { Norma, NormaConDimension, NormaFiltro } from '../interfaces/norma.interface';
import { CrearNormaDto, ActualizarNormaDto } from '../dto/norma.dto';
import { tbl } from '@database/db-table.helper';

@Injectable()
export class NormasRepository implements INormasRepository {
  private get schema(): string {
    return this.config.get<string>('hana.schema');
  }

  private get dbType(): string {
    return this.config.get<string>('app.dbType', 'HANA').toUpperCase();
  }

  private get DB_NR(): string {
    return tbl(this.schema, 'REND_NORMAS', this.dbType);
  }

  private get DB_DIM(): string {
    return tbl(this.schema, 'REND_DIMENSIONES', this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Normaliza una fila de base de datos a la interfaz Norma
   */
  private normalize(row: any): Norma {
    return {
      factorCode: String(this.db.col(row, 'NR_FACTOR_CODE') ?? ''),
      descripcion: String(this.db.col(row, 'NR_DESCRIPCION') ?? ''),
      dimension: Number(this.db.col(row, 'NR_DIMENSION') ?? 0),
      activa: (this.db.col(row, 'NR_ACTIVA') ?? 'Y') === 'Y',
    };
  }

  /**
   * Normaliza una fila con join a dimensión
   */
  private normalizeWithDimension(row: any): NormaConDimension {
    return {
      ...this.normalize(row),
      dimensionName: String(this.db.col(row, 'DIM_NAME') ?? ''),
    };
  }

  /**
   * Construye la cláusula WHERE según los filtros
   */
  private buildWhereClause(
    filtro?: NormaFiltro,
  ): { clause: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtro?.factorCode) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"NR_FACTOR_CODE" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"NR_FACTOR_CODE" LIKE ?`);
      }
      params.push(`%${filtro.factorCode}%`);
    }

    if (filtro?.descripcion) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"NR_DESCRIPCION" ILIKE $${conditions.length + 1}`);
      } else {
        conditions.push(`"NR_DESCRIPCION" LIKE ?`);
      }
      params.push(`%${filtro.descripcion}%`);
    }

    if (filtro?.dimension !== undefined) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"NR_DIMENSION" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"NR_DIMENSION" = ?`);
      }
      params.push(filtro.dimension);
    }

    if (filtro?.activa !== undefined) {
      if (this.dbType === 'POSTGRES') {
        conditions.push(`"NR_ACTIVA" = $${conditions.length + 1}`);
      } else {
        conditions.push(`"NR_ACTIVA" = ?`);
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
    sortBy: string = 'factorCode',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): string {
    const columnMap: Record<string, string> = {
      factorCode: '"NR_FACTOR_CODE"',
      descripcion: '"NR_DESCRIPCION"',
      dimension: '"NR_DIMENSION"',
      activa: '"NR_ACTIVA"',
    };

    const column = columnMap[sortBy] || '"NR_FACTOR_CODE"';
    return `ORDER BY ${column} ${sortOrder.toUpperCase()}`;
  }

  async findAll(filtro?: NormaFiltro): Promise<NormaConDimension[]> {
    try {
      const { clause, params } = this.buildWhereClause(filtro);
      const orderBy = this.buildOrderByClause(filtro?.sortBy, filtro?.sortOrder);

      const sql = `
        SELECT nr."NR_FACTOR_CODE", nr."NR_DESCRIPCION", nr."NR_DIMENSION", nr."NR_ACTIVA",
               d."DIM_NAME"
        FROM ${this.DB_NR} nr
        LEFT JOIN ${this.DB_DIM} d ON d."DIM_CODE" = nr."NR_DIMENSION"
        ${clause}
        ${orderBy}
      `;
      const rows = await this.db.query<any>(sql, params);

      return rows.map((r) => this.normalizeWithDimension(r));
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al consultar normas: ${err.message}`,
      );
    }
  }

  async findByFactorCode(factorCode: string): Promise<Norma | null> {
    try {
      const placeholder = this.dbType === 'POSTGRES' ? '$1' : '?';
      const sql = `SELECT "NR_FACTOR_CODE", "NR_DESCRIPCION", "NR_DIMENSION", "NR_ACTIVA" FROM ${this.DB_NR} WHERE "NR_FACTOR_CODE" = ${placeholder}`;
      const rows = await this.db.query<any>(sql, [factorCode]);

      return rows[0] ? this.normalize(rows[0]) : null;
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Error al buscar norma: ${err.message}`,
      );
    }
  }

  async exists(factorCode: string): Promise<boolean> {
    const norma = await this.findByFactorCode(factorCode);
    return norma !== null;
  }

  async dimensionExists(code: number): Promise<boolean> {
    try {
      const placeholder = this.dbType === 'POSTGRES' ? '$1' : '?';
      const sql = `SELECT "DIM_CODE" FROM ${this.DB_DIM} WHERE "DIM_CODE" = ${placeholder}`;
      const rows = await this.db.query<any>(sql, [code]);
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  async create(dto: CrearNormaDto): Promise<Norma> {
    try {
      // Verificar si ya existe
      const exists = await this.findByFactorCode(dto.factorCode);
      if (exists) {
        throw new ConflictException(
          `Ya existe una norma con el código de factor '${dto.factorCode}'`,
        );
      }

      // Verificar que la dimensión exista
      const dimExists = await this.dimensionExists(dto.dimension);
      if (!dimExists) {
        throw new BadRequestException(
          `La dimensión ${dto.dimension} no existe`,
        );
      }

      const factorCode = dto.factorCode.trim().toUpperCase();
      const descripcion = dto.descripcion.trim();
      const activa = dto.activa !== false ? 'Y' : 'N';

      if (this.dbType === 'POSTGRES') {
        await this.db.execute(
          `INSERT INTO ${this.DB_NR} ("NR_FACTOR_CODE", "NR_DESCRIPCION", "NR_DIMENSION", "NR_ACTIVA") VALUES ($1, $2, $3, $4)`,
          [factorCode, descripcion, dto.dimension, activa],
        );
      } else {
        await this.db.execute(
          `INSERT INTO ${this.DB_NR} ("NR_FACTOR_CODE", "NR_DESCRIPCION", "NR_DIMENSION", "NR_ACTIVA") VALUES (?, ?, ?, ?)`,
          [factorCode, descripcion, dto.dimension, activa],
        );
      }

      return {
        factorCode,
        descripcion,
        dimension: dto.dimension,
        activa: dto.activa !== false,
      };
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al crear norma: ${err.message}`,
      );
    }
  }

  async update(factorCode: string, dto: ActualizarNormaDto): Promise<Norma> {
    try {
      // Verificar que existe
      const existing = await this.findByFactorCode(factorCode);
      if (!existing) {
        throw new NotFoundException(`Norma con código '${factorCode}' no encontrada`);
      }

      // Si cambia la dimensión, verificar que exista
      if (dto.dimension !== undefined) {
        const dimExists = await this.dimensionExists(dto.dimension);
        if (!dimExists) {
          throw new BadRequestException(
            `La dimensión ${dto.dimension} no existe`,
          );
        }
      }

      const parts: string[] = [];
      const params: any[] = [];

      if (dto.descripcion !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"NR_DESCRIPCION" = $${parts.length + 1}`);
        } else {
          parts.push(`"NR_DESCRIPCION" = ?`);
        }
        params.push(dto.descripcion.trim());
      }

      if (dto.dimension !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"NR_DIMENSION" = $${parts.length + 1}`);
        } else {
          parts.push(`"NR_DIMENSION" = ?`);
        }
        params.push(dto.dimension);
      }

      if (dto.activa !== undefined) {
        if (this.dbType === 'POSTGRES') {
          parts.push(`"NR_ACTIVA" = $${parts.length + 1}`);
        } else {
          parts.push(`"NR_ACTIVA" = ?`);
        }
        params.push(dto.activa ? 'Y' : 'N');
      }

      if (parts.length === 0) {
        return existing; // No hay cambios
      }

      params.push(factorCode);

      if (this.dbType === 'POSTGRES') {
        const placeholder = `$${parts.length}`;
        await this.db.execute(
          `UPDATE ${this.DB_NR} SET ${parts.join(', ')} WHERE "NR_FACTOR_CODE" = ${placeholder}`,
          params,
        );
      } else {
        await this.db.execute(
          `UPDATE ${this.DB_NR} SET ${parts.join(', ')} WHERE "NR_FACTOR_CODE" = ?`,
          params,
        );
      }

      return {
        factorCode,
        descripcion: dto.descripcion ?? existing.descripcion,
        dimension: dto.dimension ?? existing.dimension,
        activa: dto.activa ?? existing.activa,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al actualizar norma: ${err.message}`,
      );
    }
  }

  async remove(factorCode: string): Promise<{ affected: number }> {
    try {
      // Verificar que existe
      const existing = await this.findByFactorCode(factorCode);
      if (!existing) {
        throw new NotFoundException(`Norma con código '${factorCode}' no encontrada`);
      }

      const placeholder = this.dbType === 'POSTGRES' ? '$1' : '?';
      const result = await this.db.execute(
        `DELETE FROM ${this.DB_NR} WHERE "NR_FACTOR_CODE" = ${placeholder}`,
        [factorCode],
      );

      return { affected: result ?? 1 };
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new InternalServerErrorException(
        `Error al eliminar norma: ${err.message}`,
      );
    }
  }
}
