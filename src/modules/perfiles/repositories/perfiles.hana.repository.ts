import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
import { IPerfilesRepository } from './perfiles.repository.interface';
import { Perfil } from '../interfaces/perfil.interface';
import { CreatePerfilDto } from '../dto/create-perfil.dto';
import { UpdatePerfilDto } from '../dto/update-perfil.dto';

const SAFE_COLS = `
  "U_CodPerfil", "U_NombrePerfil", "U_Trabaja", "U_Per_CtaBl",
  "U_PRO_CAR", "U_PRO_Texto", "U_CUE_CAR", "U_CUE_Texto",
  "U_EMP_CAR", "U_EMP_TEXTO", "U_ControlPartida", "U_CntLineas",
  "U_Bolivianos", "U_SUCURSAL", "U_REP1", "U_REP2"
`;

@Injectable()
export class PerfilesHanaRepository implements IPerfilesRepository {
  private readonly logger = new Logger(PerfilesHanaRepository.name);

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get DB(): string {
    return `"${this.schema}"."REND_PERFIL"`;
  }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<Perfil[]> {
    return this.hanaService.query<Perfil>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} ORDER BY "U_NombrePerfil"`,
    );
  }

  async findOne(id: number): Promise<Perfil | null> {
    const rows = await this.hanaService.query<Perfil>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_CodPerfil" = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  async create(dto: CreatePerfilDto): Promise<Perfil | null> {
    await this.hanaService.execute(
      `INSERT INTO ${this.DB}
         ("U_NombrePerfil", "U_Trabaja", "U_Per_CtaBl",
          "U_PRO_CAR", "U_PRO_Texto", "U_CUE_CAR", "U_CUE_Texto",
          "U_EMP_CAR", "U_EMP_TEXTO", "U_ControlPartida", "U_CntLineas",
          "U_Bolivianos", "U_SUCURSAL", "U_REP1", "U_REP2")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.nombrePerfil,
        dto.trabaja        ?? '0',
        dto.perCtaBl       ?? 0,
        dto.proCar         ?? 'TODOS',
        dto.proTexto       ?? '',
        dto.cueCar         ?? 'TODOS',
        dto.cueTexto       ?? '',
        dto.empCar         ?? 'TODOS',
        dto.empTexto       ?? '',
        dto.controlPartida ?? 0,
        dto.cntLineas      ?? 5,
        dto.bolivianos     ?? 0,
        dto.sucursal       ?? 0,
        dto.rep1           ?? '',
        dto.rep2           ?? '',
      ],
    );

    // Recuperar el ID generado por IDENTITY antes de que otra sesión haga otro INSERT
    const idRows = await this.hanaService.query<Record<string, number>>(
      `SELECT CURRENT_IDENTITY_VALUE() AS "newId" FROM DUMMY`,
    );
    const newId = HanaService.col(idRows[0], 'newId');
    return this.findOne(newId);
  }

  async update(id: number, dto: UpdatePerfilDto): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (dto.nombrePerfil   !== undefined) { setParts.push('"U_NombrePerfil" = ?');   params.push(dto.nombrePerfil); }
    if (dto.trabaja        !== undefined) { setParts.push('"U_Trabaja" = ?');         params.push(dto.trabaja); }
    if (dto.perCtaBl       !== undefined) { setParts.push('"U_Per_CtaBl" = ?');      params.push(dto.perCtaBl); }
    if (dto.proCar         !== undefined) { setParts.push('"U_PRO_CAR" = ?');        params.push(dto.proCar); }
    if (dto.proTexto       !== undefined) { setParts.push('"U_PRO_Texto" = ?');      params.push(dto.proTexto); }
    if (dto.cueCar         !== undefined) { setParts.push('"U_CUE_CAR" = ?');        params.push(dto.cueCar); }
    if (dto.cueTexto       !== undefined) { setParts.push('"U_CUE_Texto" = ?');      params.push(dto.cueTexto); }
    if (dto.empCar         !== undefined) { setParts.push('"U_EMP_CAR" = ?');        params.push(dto.empCar); }
    if (dto.empTexto       !== undefined) { setParts.push('"U_EMP_TEXTO" = ?');      params.push(dto.empTexto); }
    if (dto.controlPartida !== undefined) { setParts.push('"U_ControlPartida" = ?'); params.push(dto.controlPartida); }
    if (dto.cntLineas      !== undefined) { setParts.push('"U_CntLineas" = ?');      params.push(dto.cntLineas); }
    if (dto.bolivianos     !== undefined) { setParts.push('"U_Bolivianos" = ?');     params.push(dto.bolivianos); }
    if (dto.sucursal       !== undefined) { setParts.push('"U_SUCURSAL" = ?');       params.push(dto.sucursal); }
    if (dto.rep1           !== undefined) { setParts.push('"U_REP1" = ?');           params.push(dto.rep1); }
    if (dto.rep2           !== undefined) { setParts.push('"U_REP2" = ?');           params.push(dto.rep2); }

    if (!setParts.length) return { affected: 0 };

    params.push(id);
    const affected = await this.hanaService.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_CodPerfil" = ?`,
      params,
    );
    return { affected };
  }

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM ${this.DB} WHERE "U_CodPerfil" = ?`,
      [id],
    );
    return { affected };
  }
}
