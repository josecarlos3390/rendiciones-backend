import {
  Injectable, Inject, NotFoundException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { IRendMRepository } from './repositories/rend-m.repository.interface';
import { CreateRendMDto }   from './dto/create-rend-m.dto';
import { UpdateRendMDto }   from './dto/update-rend-m.dto';

@Injectable()
export class RendMService {
  private readonly logger = new Logger(RendMService.name);

  constructor(
    @Inject('REND_M_REPOSITORY')
    private readonly repo: IRendMRepository,
  ) {}

  /** ADMIN ve todas; USER ve solo las suyas */
  async findAll(role: string, idUsuario: string) {
    if (role === 'ADMIN') return this.repo.findAll();
    return this.repo.findByUser(idUsuario);
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
    return this.repo.create(dto, idUsuario, nomUsuario, nombrePerfil);
  }

  async update(id: number, dto: UpdateRendMDto, role: string, idUsuario: string) {
    const row = await this.findOne(id);

    // USER solo puede editar sus propias rendiciones en estado ABIERTO (0)
    if (role !== 'ADMIN') {
      if (row.U_IdUsuario !== idUsuario) {
        throw new ForbiddenException('No puedes editar rendiciones de otro usuario');
      }
      if (row.U_Estado !== 0) {
        throw new ForbiddenException('Solo se pueden editar rendiciones en estado ABIERTO');
      }
    }

    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number, role: string, idUsuario: string) {
    const row = await this.findOne(id);

    if (role !== 'ADMIN') {
      if (row.U_IdUsuario !== idUsuario) {
        throw new ForbiddenException('No puedes eliminar rendiciones de otro usuario');
      }
      if (row.U_Estado !== 0) {
        throw new ForbiddenException('Solo se pueden eliminar rendiciones en estado ABIERTO');
      }
    }

    return this.repo.remove(id);
  }
}
