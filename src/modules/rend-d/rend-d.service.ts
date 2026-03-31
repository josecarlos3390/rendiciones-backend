import {
  Injectable, Inject, NotFoundException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { IRendDRepository }  from './repositories/rend-d.repository.interface';
import { RendMService }      from '../rend-m/rend-m.service';
import { CreateRendDDto }    from './dto/create-rend-d.dto';
import { UpdateRendDDto }    from './dto/update-rend-d.dto';

@Injectable()
export class RendDService {
  private readonly logger = new Logger(RendDService.name);

  constructor(
    @Inject('REND_D_REPOSITORY')
    private readonly repo:        IRendDRepository,
    private readonly rendMService: RendMService,
  ) {}

  /**
   * Valida si el usuario puede LEER el detalle de una rendición.
   * Puede acceder:
   *   - ADMIN siempre
   *   - Propietario (U_IdUsuario === idUsuario)
   *   - Aprobador del propietario (esAprobador + isSubordinado)
   *   - Usuario sin aprobador con permiso sync (sinAprobador) — para coordinar sync
   */
  private async checkLecturaAccess(
    cabecera:      { U_IdUsuario: string; U_Estado: number },
    role:          string,
    idUsuario:     string,
    loginUsername: string,
    esAprobador:   boolean,
    sinAprobador:  boolean,
  ): Promise<void> {
    if (role === 'ADMIN') return;
    if (cabecera.U_IdUsuario === idUsuario) return;

    // Aprobador puede ver rendiciones de sus subordinados
    if (esAprobador) {
      const esSub = await this.rendMService.isSubordinado(cabecera.U_IdUsuario, loginUsername);
      if (esSub) return;
    }

    // Usuario sin aprobador (nivel final/sync) puede ver rendiciones de sus subordinados
    if (sinAprobador) {
      const esSub = await this.rendMService.isSubordinado(cabecera.U_IdUsuario, loginUsername);
      if (esSub) return;
    }

    throw new ForbiddenException('No tenés acceso a esta rendición');
  }

  /**
   * Valida si el usuario puede ESCRIBIR (crear/editar/eliminar) en el detalle.
   * Solo el propietario en estado ABIERTO, o el aprobador en estado ENVIADO.
   */
  private async checkEscrituraAccess(
    cabecera:      { U_IdUsuario: string; U_Estado: number },
    role:          string,
    idUsuario:     string,
    loginUsername: string,
    esAprobador:   boolean,
  ): Promise<void> {
    if (role === 'ADMIN') return;

    const esPropietario = cabecera.U_IdUsuario === idUsuario;

    if (esPropietario) {
      if (cabecera.U_Estado !== 1) {
        throw new ForbiddenException('Solo se pueden modificar documentos de rendiciones en estado ABIERTO');
      }
      return;
    }

    // Aprobador puede editar en ENVIADO (estado 4)
    if (esAprobador && cabecera.U_Estado === 4) {
      const esSub = await this.rendMService.isSubordinado(cabecera.U_IdUsuario, loginUsername);
      if (esSub) return;
    }

    throw new ForbiddenException('No tenés acceso para modificar esta rendición');
  }

  async findByRendicion(
    idRendicion:   number,
    role:          string,
    idUsuario:     string,
    loginUsername: string  = '',
    esAprobador:   boolean = false,
    sinAprobador:  boolean = false,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    await this.checkLecturaAccess(cabecera, role, idUsuario, loginUsername, esAprobador, sinAprobador);
    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    return this.repo.findByRendicion(idRendicion, idUsuarioNum);
  }

  async findOne(
    idRendicion:   number,
    idRD:          number,
    role:          string,
    idUsuario:     string,
    loginUsername: string  = '',
    esAprobador:   boolean = false,
    sinAprobador:  boolean = false,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    await this.checkLecturaAccess(cabecera, role, idUsuario, loginUsername, esAprobador, sinAprobador);
    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    const row = await this.repo.findOne(idRendicion, idRD, idUsuarioNum);
    if (!row) throw new NotFoundException(`Documento ${idRD} no encontrado en rendición ${idRendicion}`);
    return row;
  }

  async create(
    idRendicion:  number,
    idUsuario:    number,
    role:         string,
    idUsuarioStr: string,
    dto:          CreateRendDDto,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);

    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuarioStr) {
      throw new ForbiddenException('No tenés acceso a esta rendición');
    }
    if (role !== 'ADMIN' && cabecera.U_Estado !== 1) {
      throw new ForbiddenException('Solo se pueden agregar documentos a rendiciones en estado ABIERTO');
    }

    const result = await this.repo.create(idRendicion, idUsuario, dto);
    this.logger.log(`REND_D creado en rendición ${idRendicion} por usuario ${idUsuario}`);
    return result;
  }

  async update(
    idRendicion:   number,
    idRD:          number,
    dto:           UpdateRendDDto,
    role:          string,
    idUsuario:     string,
    loginUsername: string  = '',
    esAprobador:   boolean = false,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    await this.checkEscrituraAccess(cabecera, role, idUsuario, loginUsername, esAprobador);
    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    await this.repo.update(idRendicion, idRD, idUsuarioNum, dto);
    return this.findOne(idRendicion, idRD, role, idUsuario, loginUsername, esAprobador, false);
  }

  async remove(
    idRendicion: number,
    idRD:        number,
    role:        string,
    idUsuario:   string,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);

    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuario) {
      throw new ForbiddenException('No tenés acceso a esta rendición');
    }
    if (role !== 'ADMIN' && cabecera.U_Estado !== 1) {
      throw new ForbiddenException('Solo se pueden eliminar documentos de rendiciones en estado ABIERTO');
    }

    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    return this.repo.remove(idRendicion, idRD, idUsuarioNum);
  }
}