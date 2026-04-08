import {
  Injectable, Inject, NotFoundException,
  ForbiddenException, Logger, BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRendDRepository }  from './repositories/rend-d.repository.interface';
import { RendMService }      from '../rend-m/rend-m.service';
import { CreateRendDDto }    from './dto/create-rend-d.dto';
import { UpdateRendDDto }    from './dto/update-rend-d.dto';
import { CoaService }        from '../coa/coa.service';
import { ProyectosService }  from '../proyectos/proyectos.service';
import { ProvService }       from '../prov/prov.service';
import { NormasService }     from '../normas/normas.service';

@Injectable()
export class RendDService {
  private readonly logger = new Logger(RendDService.name);

  constructor(
    @Inject('REND_D_REPOSITORY')
    private readonly repo:        IRendDRepository,
    private readonly rendMService: RendMService,
    private readonly coaService:   CoaService,
    private readonly proyectosService: ProyectosService,
    private readonly provService:  ProvService,
    private readonly normasService: NormasService,
    private readonly config:       ConfigService,
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

  /**
   * Valida que los datos maestros referenciados existan y estén activos.
   * SOLO en modo OFFLINE: en modo ONLINE los datos vienen de SAP Service Layer
   * y no se usan las tablas locales de maestros.
   */
  private async validarDatosMaestros(dto: CreateRendDDto | UpdateRendDDto): Promise<void> {
    // Solo validar en modo OFFLINE (cuando se usan tablas locales)
    const mode = this.config.get<string>('app.mode', 'ONLINE').toUpperCase();
    if (mode !== 'OFFLINE') {
      return; // En modo ONLINE no validamos contra tablas locales
    }

    const errores: string[] = [];

    // Validar cuenta contable si está presente
    if (dto.cuenta) {
      try {
        const cuenta = await this.coaService.findByCode(dto.cuenta);
        if (!cuenta.activa) {
          errores.push(`La cuenta '${dto.cuenta}' está inactiva`);
        }
      } catch {
        errores.push(`La cuenta '${dto.cuenta}' no existe`);
      }
    }

    // Validar proyecto si está presente
    if (dto.proyecto) {
      try {
        const proyecto = await this.proyectosService.findByCode(dto.proyecto);
        if (!proyecto.activo) {
          errores.push(`El proyecto '${dto.proyecto}' está inactivo`);
        }
      } catch {
        errores.push(`El proyecto '${dto.proyecto}' no existe`);
      }
    }

    // Validar proveedor si está presente (por código)
    // Nota: Los proveedores eventuales (PL*) no están en la tabla de proveedores regulares
    if (dto.codProv && !dto.codProv.startsWith('PL')) {
      try {
        const prov = await this.provService.findByCodigo(dto.codProv);
        if (!prov) {
          errores.push(`El proveedor '${dto.codProv}' no existe`);
        }
      } catch {
        errores.push(`El proveedor '${dto.codProv}' no existe`);
      }
    }

    // Validar normas N1, N2, N3 si están presentes
    for (const norma of [dto.n1, dto.n2, dto.n3]) {
      if (norma) {
        try {
          const normaData = await this.normasService.findByFactorCode(norma);
          if (!normaData.activa) {
            errores.push(`La norma '${norma}' está inactiva`);
          }
        } catch {
          errores.push(`La norma '${norma}' no existe`);
        }
      }
    }

    if (errores.length > 0) {
      throw new BadRequestException({
        message: 'Datos maestros inválidos',
        errors: errores,
      });
    }
  }

  async create(
    idRendicion:  number,
    idUsuario:    number,
    role:         string,
    idUsuarioStr: string,
    loginUsername: string,
    esAprobador:  boolean,
    dto:          CreateRendDDto,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    await this.checkEscrituraAccess(cabecera, role, idUsuarioStr, loginUsername, esAprobador);

    // Validar datos maestros antes de crear
    await this.validarDatosMaestros(dto);

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
    
    // Validar datos maestros antes de actualizar
    await this.validarDatosMaestros(dto);
    
    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    await this.repo.update(idRendicion, idRD, idUsuarioNum, dto);
    return this.findOne(idRendicion, idRD, role, idUsuario, loginUsername, esAprobador, false);
  }

  async remove(
    idRendicion: number,
    idRD:        number,
    role:        string,
    idUsuario:   string,
    loginUsername: string,
    esAprobador: boolean,
  ) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    await this.checkEscrituraAccess(cabecera, role, idUsuario, loginUsername, esAprobador);

    const idUsuarioNum = Number(cabecera.U_IdUsuario);
    return this.repo.remove(idRendicion, idRD, idUsuarioNum);
  }
}