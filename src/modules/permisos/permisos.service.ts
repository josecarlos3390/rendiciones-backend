import { Injectable, Inject, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { IPermisosRepository } from './repositories/permisos.repository.interface';
import { CreatePermisoDto } from './dto/create-permiso.dto';

/** Códigos de error del driver SAP HANA para violación de unicidad */
const HANA_UNIQUE_VIOLATION_CODES = new Set([
  301,   // unique constraint violated
  2528,  // duplicate key
]);

@Injectable()
export class PermisosService {
  private readonly logger = new Logger(PermisosService.name);

  constructor(
    @Inject('PERMISOS_REPOSITORY')
    private readonly repo: IPermisosRepository,
  ) {}

  findUsuarios() {
    return this.repo.findUsuarios();
  }

  findByUsuario(idUsuario: number) {
    return this.repo.findByUsuario(idUsuario);
  }

  async create(dto: CreatePermisoDto) {
    const nombrePerfil = await this.repo.findNombrePerfil(dto.idPerfil);
    if (!nombrePerfil) {
      throw new NotFoundException(`Perfil ${dto.idPerfil} no encontrado`);
    }

    try {
      const result = await this.repo.create(dto, nombrePerfil);
      this.logger.log(`Permiso asignado: usuario ${dto.idUsuario} → perfil ${dto.idPerfil}`);
      return result;
    } catch (err: any) {
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