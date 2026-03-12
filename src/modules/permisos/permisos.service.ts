import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { IPermisosRepository } from './repositories/permisos.repository.interface';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { HanaService } from '../../database/hana.service';
import { ConfigService } from '@nestjs/config';

/** Códigos de error del driver SAP HANA para violación de unicidad */
const HANA_UNIQUE_VIOLATION_CODES = new Set([
  301,   // unique constraint violated
  2528,  // duplicate key
]);

@Injectable()
export class PermisosService {
  private readonly logger = new Logger(PermisosService.name);

  private get schema(): string { return this.configService.get<string>('hana.schema'); }

  constructor(
    @Inject('PERMISOS_REPOSITORY')
    private readonly repo: IPermisosRepository,
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  findUsuarios() {
    return this.repo.findUsuarios();
  }

  findByUsuario(idUsuario: number) {
    return this.repo.findByUsuario(idUsuario);
  }

  async create(dto: CreatePermisoDto) {
    // Obtener el nombre del perfil para guardarlo en REND_PRM
    const perfiles = await this.hanaService.query<any>(
      `SELECT "U_NombrePerfil" FROM "${this.schema}"."REND_PERFIL" WHERE "U_CodPerfil" = ?`,
      [dto.idPerfil],
    );
    if (!perfiles.length) {
      throw new NotFoundException(`Perfil ${dto.idPerfil} no encontrado`);
    }
    const nombrePerfil = HanaService.col(perfiles[0], 'U_NombrePerfil');

    try {
      const result = await this.repo.create(dto, nombrePerfil);
      this.logger.log(`Permiso asignado: usuario ${dto.idUsuario} → perfil ${dto.idPerfil}`);
      return result;
    } catch (err: any) {
      // El driver HANA lanza el código de error en err.code o err.sqlCode
      const code = err?.code ?? err?.sqlCode;
      if (HANA_UNIQUE_VIOLATION_CODES.has(Number(code))) {
        throw new ConflictException('Este perfil ya está asignado al usuario');
      }
      throw err;
    }
  }

  async remove(idUsuario: number, idPerfil: number) {
    const { affected } = await this.repo.remove(idUsuario, idPerfil);
    if (affected === 0) {
      throw new NotFoundException('Permiso no encontrado');
    }
    return { affected };
  }
}