import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { IRendMRepository } from './rend-m.repository.interface';
import { RendM } from '../interfaces/rend-m.interface';
import { CreateRendMDto } from '../dto/create-rend-m.dto';
import { UpdateRendMDto } from '../dto/update-rend-m.dto';
import { PaginatedResult } from '../../../common/dto/pagination.dto';
import { tbl } from '../../../database/db-table.helper';
import { getTableMutex } from '../../../common/utils/db-mutex';

const SAFE_COLS = `
  "U_IdRendicion", "U_IdUsuario", "U_IdPerfil",
  "U_NomUsuario", "U_NombrePerfil", "U_Preliminar", "U_Estado",
  "U_Cuenta", "U_NombreCuenta", "U_Empleado", "U_NombreEmpleado",
  "U_FechaIni", "U_FechaFinal", "U_Monto", "U_Objetivo",
  "U_FechaCreacion", "U_FechaMod",
  "U_AUXILIAR1", "U_AUXILIAR2", "U_AUXILIAR3"
`;

@Injectable()
export class RendMHanaRepository implements IRendMRepository {
  private readonly logger = new Logger(RendMHanaRepository.name);

  private get dbType(): string  { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get DB(): string      { return tbl(this.schema, 'REND_M', this.dbType); }
  private get DB_D(): string    { return tbl(this.schema, 'REND_D', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findByUser(
    idUsuario: string,
    idPerfil:  number | undefined,
    page:      number,
    limit:     number,
  ): Promise<PaginatedResult<RendM>> {
    const offset = (page - 1) * limit;
    const hasPerfilFilter = idPerfil !== undefined;

    // WHERE dinámico según filtros
    const where  = hasPerfilFilter
      ? `WHERE "U_IdUsuario" = ? AND "U_IdPerfil" = ?`
      : `WHERE "U_IdUsuario" = ?`;
    const params = hasPerfilFilter ? [idUsuario, idPerfil] : [idUsuario];

    // COUNT para el total
    const countRow = await this.db.queryOne<Record<string, number>>(
      `SELECT COUNT(*) AS "total" FROM ${this.DB} ${where}`,
      params,
    );
    const total = this.db.col(countRow, 'total') ?? 0;

    // Datos paginados con LIMIT/OFFSET (sintaxis HANA)
    const data = await this.db.query<RendM>(
      `SELECT ${SAFE_COLS} FROM ${this.DB}
       ${where}
       ORDER BY "U_FechaCreacion" DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<RendM | null> {
    const rows = await this.db.query<RendM>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(
    dto:          CreateRendMDto,
    idUsuario:    string,
    nomUsuario:   string,
    nombrePerfil: string,
  ): Promise<RendM | null> {
    const mutex = getTableMutex('REND_M');

    return mutex.runExclusive(async () => {
      const now = new Date().toISOString();

      const idRows = await this.db.query<Record<string, number>>(
        `SELECT COALESCE(MAX("U_IdRendicion"), 0) + 1 AS "newId" FROM ${this.DB}`,
      );
      const newId = this.db.col(idRows[0], 'newId');

      await this.db.execute(
        `INSERT INTO ${this.DB}
          ("U_IdRendicion",
            "U_IdUsuario", "U_IdPerfil", "U_NomUsuario", "U_NombrePerfil",
            "U_Preliminar", "U_Estado",
            "U_Cuenta", "U_NombreCuenta", "U_Empleado", "U_NombreEmpleado",
            "U_FechaIni", "U_FechaFinal", "U_Monto", "U_Objetivo",
            "U_FechaCreacion", "U_FechaMod",
            "U_AUXILIAR1", "U_AUXILIAR2", "U_AUXILIAR3")
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          idUsuario,
          dto.idPerfil,
          nomUsuario,
          nombrePerfil,
          '-1',
          dto.cuenta,
          dto.nombreCuenta,
          dto.empleado       ?? '',
          dto.nombreEmpleado ?? '',
          dto.fechaIni,
          dto.fechaFinal,
          dto.monto,
          dto.objetivo,
          now,
          now,
          dto.auxiliar1     ?? '',
          dto.auxiliar2     ?? '',
          dto.auxiliar3     ?? '',
        ],
      );

      this.logger.log(`REND_M creada: ID ${newId} — usuario ${idUsuario}`);
      return this.findOne(newId);
    });
  }

  async update(id: number, dto: UpdateRendMDto): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (dto.idPerfil       !== undefined) { setParts.push('"U_IdPerfil" = ?');       params.push(dto.idPerfil); }
    if (dto.cuenta         !== undefined) { setParts.push('"U_Cuenta" = ?');         params.push(dto.cuenta); }
    if (dto.nombreCuenta   !== undefined) { setParts.push('"U_NombreCuenta" = ?');   params.push(dto.nombreCuenta); }
    if (dto.empleado       !== undefined) { setParts.push('"U_Empleado" = ?');       params.push(dto.empleado); }
    if (dto.nombreEmpleado !== undefined) { setParts.push('"U_NombreEmpleado" = ?'); params.push(dto.nombreEmpleado); }
    if (dto.objetivo       !== undefined) { setParts.push('"U_Objetivo" = ?');       params.push(dto.objetivo); }
    if (dto.fechaIni       !== undefined) { setParts.push('"U_FechaIni" = ?');       params.push(dto.fechaIni); }
    if (dto.fechaFinal     !== undefined) { setParts.push('"U_FechaFinal" = ?');     params.push(dto.fechaFinal); }
    if (dto.monto          !== undefined) { setParts.push('"U_Monto" = ?');          params.push(dto.monto); }
    if (dto.preliminar     !== undefined) { setParts.push('"U_Preliminar" = ?');     params.push(dto.preliminar); }
    if (dto.auxiliar1      !== undefined) { setParts.push('"U_AUXILIAR1" = ?');      params.push(dto.auxiliar1); }
    if (dto.auxiliar2      !== undefined) { setParts.push('"U_AUXILIAR2" = ?');      params.push(dto.auxiliar2); }
    if (dto.auxiliar3      !== undefined) { setParts.push('"U_AUXILIAR3" = ?');      params.push(dto.auxiliar3); }

    if (!setParts.length) return { affected: 0 };

    // Siempre actualizar FechaMod
    setParts.push('"U_FechaMod" = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_IdRendicion" = ?`,
      params,
    );
    return { affected };
  }

  async updateEstado(id: number, estado: number): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.DB} SET "U_Estado" = ? WHERE "U_IdRendicion" = ?`,
      [estado, id],
    );
  }

  async getStats(idUsuario: string, isAdmin: boolean): Promise<any> {
    // Siempre consultar las propias del usuario
    const rowsUser = await this.db.query<any>(
      `SELECT
        COUNT(*) AS "total",
        SUM(CASE WHEN "U_Estado" = 1 THEN 1 ELSE 0 END) AS "abiertas",
        SUM(CASE WHEN "U_Estado" = 4 THEN 1 ELSE 0 END) AS "enviadas",
        SUM(CASE WHEN "U_Estado" = 3 THEN 1 ELSE 0 END) AS "aprobadas",
        SUM(CASE WHEN "U_Estado" = 2 THEN 1 ELSE 0 END) AS "cerradas",
        SUM(CASE WHEN "U_Estado" = 5 THEN 1 ELSE 0 END) AS "sincronizadas",
        COALESCE(SUM("U_Monto"), 0) AS "montoTotal"
      FROM ${this.DB} WHERE "U_IdUsuario" = ?`,
      [idUsuario],
    );
    const r = rowsUser[0];
    const stats: any = {
      total:         Number(this.db.col(r, 'total'))         || 0,
      abiertas:      Number(this.db.col(r, 'abiertas'))      || 0,
      enviadas:      Number(this.db.col(r, 'enviadas'))      || 0,
      aprobadas:     Number(this.db.col(r, 'aprobadas'))     || 0,
      cerradas:      Number(this.db.col(r, 'cerradas'))      || 0,
      sincronizadas: Number(this.db.col(r, 'sincronizadas')) || 0,
      montoTotal:    Number(this.db.col(r, 'montoTotal'))    || 0,
    };

    // Si es ADMIN, agregar totales globales del sistema
    if (isAdmin) {
      const rowsAll = await this.db.query<any>(
        `SELECT COUNT(*) AS "totalGlobal",
                COALESCE(SUM("U_Monto"), 0) AS "montoGlobal"
         FROM ${this.DB}`,
      );
      const ra = rowsAll[0];
      stats.totalGlobal  = Number(this.db.col(ra, 'totalGlobal'))  || 0;
      stats.montoGlobal  = Number(this.db.col(ra, 'montoGlobal'))  || 0;
    }

    return stats;
  }

  async remove(id: number): Promise<{ affected: number }> {
    // Primero eliminar todas las líneas de la rendición
    await this.db.execute(
      `DELETE FROM ${this.DB_D} WHERE "U_RD_RM_IdRendicion" = ?`,
      [id],
    );
    // Luego eliminar la cabecera
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [id],
    );
    return { affected };
  }
}