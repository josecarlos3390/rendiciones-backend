import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
import { IPermisosRepository } from './permisos.repository.interface';
import { Permiso, UsuarioSimple } from '../interfaces/permiso.interface';
import { CreatePermisoDto } from '../dto/create-permiso.dto';

@Injectable()
export class PermisosHanaRepository implements IPermisosRepository {
  private readonly logger = new Logger(PermisosHanaRepository.name);

  private get schema(): string  { return this.configService.get<string>('hana.schema'); }
  private get DB(): string      { return `"${this.schema}"."REND_PRM"`; }
  private get DB_USR(): string  { return `"${this.schema}"."REND_U"`; }
  private get DB_PERF(): string { return `"${this.schema}"."REND_PERFIL"`; }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findUsuarios(): Promise<UsuarioSimple[]> {
    return this.hanaService.query<UsuarioSimple>(
      `SELECT "U_IdU", "U_Login", "U_NomUser"
       FROM ${this.DB_USR}
       WHERE "U_Estado" = 'A' OR "U_Estado" IS NULL
       ORDER BY "U_NomUser", "U_Login"`,
    );
  }

  async findByUsuario(idUsuario: number): Promise<Permiso[]> {
    return this.hanaService.query<Permiso>(
      `SELECT p."U_IDUSUARIO", p."U_IDPERFIL", p."U_NOMBREPERFIL",
              u."U_Login", u."U_NomUser"
       FROM ${this.DB} p
       LEFT JOIN ${this.DB_USR} u ON u."U_IdU" = p."U_IDUSUARIO"
       WHERE p."U_IDUSUARIO" = ?
       ORDER BY p."U_NOMBREPERFIL"`,
      [idUsuario],
    );
  }

  async create(dto: CreatePermisoDto, nombrePerfil: string): Promise<Permiso> {
    await this.hanaService.execute(
      `INSERT INTO ${this.DB} ("U_IDUSUARIO", "U_IDPERFIL", "U_NOMBREPERFIL")
       VALUES (?, ?, ?)`,
      [dto.idUsuario, dto.idPerfil, nombrePerfil],
    );
    const rows = await this.hanaService.query<Permiso>(
      `SELECT p."U_IDUSUARIO", p."U_IDPERFIL", p."U_NOMBREPERFIL",
              u."U_Login", u."U_NomUser"
       FROM ${this.DB} p
       LEFT JOIN ${this.DB_USR} u ON u."U_IdU" = p."U_IDUSUARIO"
       WHERE p."U_IDUSUARIO" = ? AND p."U_IDPERFIL" = ?`,
      [dto.idUsuario, dto.idPerfil],
    );
    return rows[0];
  }

  async remove(idUsuario: number, idPerfil: number): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM ${this.DB} WHERE "U_IDUSUARIO" = ? AND "U_IDPERFIL" = ?`,
      [idUsuario, idPerfil],
    );
    return { affected };
  }

}