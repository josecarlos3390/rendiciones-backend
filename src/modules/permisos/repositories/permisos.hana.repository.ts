import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { IPermisosRepository } from './permisos.repository.interface';
import { Permiso, UsuarioSimple } from '../interfaces/permiso.interface';
import { CreatePermisoDto } from '../dto/create-permiso.dto';
import { tbl } from '../../../database/db-table.helper';

@Injectable()
export class PermisosHanaRepository implements IPermisosRepository {
  private readonly logger = new Logger(PermisosHanaRepository.name);

  private get dbType(): string  { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get schema(): string  { return this.configService.get<string>('hana.schema'); }
  private get DB(): string      { return tbl(this.schema, 'REND_PRM', this.dbType); }
  private get DB_USR(): string      { return tbl(this.schema, 'REND_U', this.dbType); }
  private get DB_PERF(): string      { return tbl(this.schema, 'REND_PERFIL', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findUsuarios(): Promise<UsuarioSimple[]> {
    return this.db.query<UsuarioSimple>(
      `SELECT "U_IdU", "U_Login", "U_NomUser", "U_SuperUser"
       FROM ${this.DB_USR}
       ORDER BY "U_SuperUser" DESC, "U_NomUser", "U_Login"`,
    );
  }

  async findByUsuario(idUsuario: number): Promise<Permiso[]> {
    return this.db.query<Permiso>(
      `SELECT p."U_IDUSUARIO", p."U_IDPERFIL", p."U_NOMBREPERFIL",
              u."U_Login", u."U_NomUser"
       FROM ${this.DB} p
       LEFT JOIN ${this.DB_USR} u ON u."U_IdU" = p."U_IDUSUARIO"
       WHERE p."U_IDUSUARIO" = ?
       ORDER BY p."U_NOMBREPERFIL"`,
      [idUsuario],
    );
  }

  async findNombrePerfil(idPerfil: number): Promise<string | null> {
    const row = await this.db.queryOne<Record<string, string>>(
      `SELECT "U_NombrePerfil" FROM ${this.DB_PERF} WHERE "U_CodPerfil" = ?`,
      [idPerfil],
    );
    if (!row) return null;
    return this.db.col(row, 'U_NombrePerfil');
  }

  async create(dto: CreatePermisoDto, nombrePerfil: string): Promise<Permiso> {
    await this.db.execute(
      `INSERT INTO ${this.DB} ("U_IDUSUARIO", "U_IDPERFIL", "U_NOMBREPERFIL")
       VALUES (?, ?, ?)`,
      [dto.idUsuario, dto.idPerfil, nombrePerfil],
    );
    const rows = await this.db.query<Permiso>(
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
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IDUSUARIO" = ? AND "U_IDPERFIL" = ?`,
      [idUsuario, idPerfil],
    );
    return { affected };
  }

}