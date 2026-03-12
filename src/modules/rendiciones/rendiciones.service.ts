import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { IRendicionesRepository } from './repositories/rendiciones.repository.interface';
import { CreateRendicionDto } from './dto/create-rendicion.dto';
import { UpdateRendicionDto } from './dto/update-rendicion.dto';

/**
 * El Service NO sabe si habla con HANA o SQL.
 * Solo conoce la interfaz IRendicionesRepository.
 * Para cambiar de BD: cambiar DB_TYPE en .env — este archivo no se toca.
 */
@Injectable()
export class RendicionesService {
  private readonly logger = new Logger(RendicionesService.name);

  constructor(
    @Inject('RENDICIONES_REPOSITORY')
    private readonly repo: IRendicionesRepository,
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const row = await this.repo.findOne(id);
    if (!row) throw new NotFoundException(`Rendicion con ID ${id} no encontrada`);
    return row;
  }

  async create(dto: CreateRendicionDto, userId: number) {
    const result = await this.repo.create(dto, userId);
    this.logger.log(`Rendicion creada por usuario ${userId}`);
    return result;
  }

  async update(id: number, dto: UpdateRendicionDto) {
    await this.findOne(id); // valida existencia
    return this.repo.update(id, dto);
  }

  async remove(id: number) {
    await this.findOne(id); // valida existencia
    return this.repo.remove(id);
  }
}
