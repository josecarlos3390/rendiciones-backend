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
    private readonly repo: IRendDRepository,
    private readonly rendMService: RendMService,
  ) {}

  /** Devuelve todos los documentos de una rendición, validando acceso */
  async findByRendicion(idRendicion: number, role: string, idUsuario: string) {
    const cabecera = await this.rendMService.findOne(idRendicion);
    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuario) {
      throw new ForbiddenException('No tienes acceso a esta rendición');
    }
    return this.repo.findByRendicion(idRendicion);
  }

  async findOne(idRD: number) {
    const row = await this.repo.findOne(idRD);
    if (!row) throw new NotFoundException(`Documento con ID ${idRD} no encontrado`);
    return row;
  }

  async create(idRendicion: number, idUsuario: number, role: string, idUsuarioStr: string, dto: CreateRendDDto) {
    // Verificar que la rendición existe y el usuario tiene acceso
    const cabecera = await this.rendMService.findOne(idRendicion);
    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuarioStr) {
      throw new ForbiddenException('No tienes acceso a esta rendición');
    }
    if (role !== 'ADMIN' && cabecera.U_Estado !== 1) {
      throw new ForbiddenException('Solo se pueden agregar documentos a rendiciones en estado ABIERTO');
    }
    const result = await this.repo.create(idRendicion, idUsuario, dto);
    this.logger.log(`REND_D creado en rendición ${idRendicion} por usuario ${idUsuario}`);
    return result;
  }

  async update(idRD: number, dto: UpdateRendDDto, role: string, idUsuario: string) {
    const doc = await this.findOne(idRD);
    // Verificar acceso a la rendición padre
    const cabecera = await this.rendMService.findOne(doc.U_RD_RM_IdRendicion);
    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuario) {
      throw new ForbiddenException('No tienes acceso a esta rendición');
    }
    if (role !== 'ADMIN' && cabecera.U_Estado !== 1) {
      throw new ForbiddenException('Solo se pueden editar documentos de rendiciones en estado ABIERTO');
    }
    await this.repo.update(idRD, dto);
    return this.findOne(idRD);
  }

  async remove(idRD: number, role: string, idUsuario: string) {
    const doc = await this.findOne(idRD);
    const cabecera = await this.rendMService.findOne(doc.U_RD_RM_IdRendicion);
    if (role !== 'ADMIN' && cabecera.U_IdUsuario !== idUsuario) {
      throw new ForbiddenException('No tienes acceso a esta rendición');
    }
    if (role !== 'ADMIN' && cabecera.U_Estado !== 1) {
      throw new ForbiddenException('Solo se pueden eliminar documentos de rendiciones en estado ABIERTO');
    }
    return this.repo.remove(idRD);
  }
}