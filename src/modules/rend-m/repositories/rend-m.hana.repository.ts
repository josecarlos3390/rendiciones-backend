import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IRendMRepository } from './rend-m.repository.interface';
import { RendM } from '../interfaces/rend-m.interface';
import { CreateRendMDto } from '../dto/create-rend-m.dto';
import { UpdateRendMDto } from '../dto/update-rend-m.dto';
import { PaginatedResult } from '../../../common/dto/pagination.dto';

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

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }
  private get dbType(): string {
    return this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
  }


  private get DB(): string {
    return tbl(this.schema, 'REND_M', this.dbType);
  }

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
    const now = new Date().toISOString();

    // REND_M no tiene columna IDENTITY — generar el ID manualmente con MAX+1
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
        '-1',               // U_Preliminar: -1 por defecto hasta generar doc preliminar
        // U_Estado 1 = ABIERTO al crear
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

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [id],
    );
    return { affected };
  }
}