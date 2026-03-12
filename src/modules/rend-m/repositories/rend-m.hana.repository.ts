import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
import { IRendMRepository } from './rend-m.repository.interface';
import { RendM } from '../interfaces/rend-m.interface';
import { CreateRendMDto } from '../dto/create-rend-m.dto';
import { UpdateRendMDto } from '../dto/update-rend-m.dto';

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

  private get DB(): string {
    return `"${this.schema}"."REND_M"`;
  }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<RendM[]> {
    return this.hanaService.query<RendM>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} ORDER BY "U_FechaCreacion" DESC`,
    );
  }

  async findByUser(idUsuario: string): Promise<RendM[]> {
    return this.hanaService.query<RendM>(
      `SELECT ${SAFE_COLS} FROM ${this.DB}
       WHERE "U_IdUsuario" = ?
       ORDER BY "U_FechaCreacion" DESC`,
      [idUsuario],
    );
  }

  async findOne(id: number): Promise<RendM | null> {
    const rows = await this.hanaService.query<RendM>(
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

    await this.hanaService.execute(
      `INSERT INTO ${this.DB}
         ("U_IdUsuario", "U_IdPerfil", "U_NomUsuario", "U_NombrePerfil",
          "U_Preliminar", "U_Estado",
          "U_Cuenta", "U_NombreCuenta", "U_Empleado", "U_NombreEmpleado",
          "U_FechaIni", "U_FechaFinal", "U_Monto", "U_Objetivo",
          "U_FechaCreacion", "U_FechaMod",
          "U_AUXILIAR1", "U_AUXILIAR2", "U_AUXILIAR3")
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUsuario,
        dto.idPerfil,
        nomUsuario,
        nombrePerfil,
        dto.preliminar    ?? '',
        // Estado 0 = ABIERTO al crear
        dto.cuenta,
        dto.nombreCuenta,
        dto.empleado,
        dto.nombreEmpleado,
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

    const idRows = await this.hanaService.query<Record<string, number>>(
      `SELECT CURRENT_IDENTITY_VALUE() AS "newId" FROM DUMMY`,
    );
    const newId = HanaService.col(idRows[0], 'newId');
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

    const affected = await this.hanaService.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_IdRendicion" = ?`,
      params,
    );
    return { affected };
  }

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [id],
    );
    return { affected };
  }
}
