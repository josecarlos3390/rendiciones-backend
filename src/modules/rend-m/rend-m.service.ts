import {
  Injectable, Inject, NotFoundException,
  ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { IRendMRepository } from './repositories/rend-m.repository.interface';
import { CreateRendMDto }   from './dto/create-rend-m.dto';
import { UpdateRendMDto }   from './dto/update-rend-m.dto';
import { PaginationDto }    from '../../common/dto/pagination.dto';
import { AdjuntosService } from '../adjuntos/adjuntos.service';

@Injectable()
export class RendMService {
  private readonly logger = new Logger(RendMService.name);

  constructor(
    @Inject('REND_M_REPOSITORY')
    private readonly repo: IRendMRepository,
    private readonly adjuntosService: AdjuntosService,
  ) {}

  /** Filtra siempre por U_IdUsuario + U_IdPerfil (cuando se provee), tanto ADMIN como USER */
  async findAll(
    role: string,
    idUsuario: string,
    idPerfil: number | undefined,
    pagination: PaginationDto,
    estados?: number[],
  ) {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 50;
    return this.repo.findByUser(idUsuario, idPerfil, page, limit, estados);
  }

  /**
   * Rendiciones de subordinados del aprobador.
   * estados: array de números (1=abierto, 2=cerrado, 3=eliminado, 4=enviado, 5=sync, 6=error, 7=aprobado)
   * Si estados vacío → todos los estados.
   */
  async findSubordinados(
    loginAprobador:   string,
    idPerfil:         number | undefined,
    estados:          number[],
    page:             number,
    limit:            number,
    idUsuarioFiltro?: string,
    cascada:          boolean = false,
  ) {
    return this.repo.findBySubordinados(loginAprobador, idPerfil, estados, page, limit, idUsuarioFiltro, cascada);
  }

  async findOne(id: number) {
    const row = await this.repo.findOne(id);
    if (!row) throw new NotFoundException(`Rendición con ID ${id} no encontrada`);
    return row;
  }

  async create(
    dto:          CreateRendMDto,
    idUsuario:    string,
    nomUsuario:   string,
    nombrePerfil: string,
  ) {
    // Si la cuenta es ASOCIADA, empleado y nombreEmpleado son obligatorios
    if (dto.cuentaAsociada === 'Y') {
      if (!dto.empleado?.trim()) {
        throw new BadRequestException('El campo empleado es obligatorio para cuentas asociadas');
      }
      if (!dto.nombreEmpleado?.trim()) {
        throw new BadRequestException('El campo nombreEmpleado es obligatorio para cuentas asociadas');
      }
    }
    return this.repo.create(dto, idUsuario, nomUsuario, nombrePerfil);
  }

  async update(
    id:              number,
    dto:             UpdateRendMDto,
    role:            string,
    idUsuario:       string,
    loginAprobador?: string,
    esAprobador?:    boolean,
  ) {
    const row = await this.findOne(id);

    if (role !== 'ADMIN') {
      const esPropietario = row.U_IdUsuario === idUsuario;

      if (esPropietario) {
        // Dueño solo puede editar sus propias en estado ABIERTO
        if (row.U_Estado !== 1) {
          throw new ForbiddenException('Solo se pueden editar rendiciones en estado ABIERTO');
        }
      } else if (esAprobador && loginAprobador) {
        // Aprobador puede editar rendiciones de sus subordinados en estado ENVIADO (4)
        if (row.U_Estado !== 4) {
          throw new ForbiddenException('El aprobador solo puede editar rendiciones en estado ENVIADO');
        }
        // Validar que el dueño de la rendición efectivamente lo tiene como aprobador
        const esSubordinado = await this.repo.isSubordinado(row.U_IdUsuario, loginAprobador);
        if (!esSubordinado) {
          throw new ForbiddenException('No tenés permiso para editar rendiciones de este usuario');
        }
      } else {
        throw new ForbiddenException('No puedes editar rendiciones de otro usuario');
      }
    }

    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  /** Verifica si idUsuario tiene a loginAprobador como su aprobador directo */
  async isSubordinado(idUsuario: string, loginAprobador: string): Promise<boolean> {
    return this.repo.isSubordinado(idUsuario, loginAprobador);
  }

  async getStats(idUsuario: string, isAdmin: boolean, idPerfil?: number) {
    return this.repo.getStats(idUsuario, isAdmin, idPerfil);
  }

  /** Cambia el estado de la rendición — usado por el módulo de aprobaciones */
  async updateEstado(id: number, estado: number): Promise<void> {
    await this.repo.updateEstado(id, estado);
  }

  /** Guarda el número de documento preliminar SAP en U_Preliminar */
  async updatePreliminar(id: number, preliminar: string): Promise<void> {
    await this.repo.updatePreliminar(id, preliminar);
  }

  async remove(id: number, role: string, idUsuario: string) {
    const row = await this.findOne(id);

    if (role !== 'ADMIN') {
      if (row.U_IdUsuario !== idUsuario) {
        throw new ForbiddenException('No puedes eliminar rendiciones de otro usuario');
      }
      if (row.U_Estado !== 1) {
        throw new ForbiddenException('Solo se pueden eliminar rendiciones en estado ABIERTO');
      }
    }

    // Borrado en cascada: eliminar adjuntos primero (archivos físicos + BD)
    this.logger.log(`Eliminando adjuntos de la rendición ${id}...`);
    const { affected: adjuntosEliminados, errores } = await this.adjuntosService.removeByRendicion(id);
    
    if (errores.length > 0) {
      this.logger.warn(`Errores al eliminar algunos adjuntos de la rendición ${id}: ${errores.join(', ')}`);
    } else if (adjuntosEliminados > 0) {
      this.logger.log(`Se eliminaron ${adjuntosEliminados} adjuntos de la rendición ${id}`);
    }

    // Ahora eliminar la rendición (cabecera + detalle se maneja en el repositorio)
    return this.repo.remove(id);
  }
}