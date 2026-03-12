import { Injectable, Inject, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { IPerfilesRepository } from './repositories/perfiles.repository.interface';
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

@Injectable()
export class PerfilesService {
  private readonly logger = new Logger(PerfilesService.name);

  constructor(
    @Inject('PERFILES_REPOSITORY')
    private readonly repo: IPerfilesRepository,
  ) {}

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: number) {
    const perfil = await this.repo.findOne(id);
    if (!perfil) throw new NotFoundException(`Perfil con ID ${id} no encontrado`);
    return perfil;
  }

  async create(dto: CreatePerfilDto) {
    const result = await this.repo.create(dto);
    this.logger.log(`Perfil creado: ${dto.nombrePerfil}`);
    return result;
  }

  async update(id: number, dto: UpdatePerfilDto) {
    await this.findOne(id); // valida existencia
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id); // valida existencia
    return this.repo.remove(id);
  }
}
