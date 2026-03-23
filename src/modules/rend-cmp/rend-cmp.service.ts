import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IRendCmpRepository, REND_CMP_REPOSITORY, RendCmp } from './repositories/rend-cmp.repository.interface';
import { CreateRendCmpDto } from './dto/create-rend-cmp.dto';
import { UpdateRendCmpDto } from './dto/update-rend-cmp.dto';

@Injectable()
export class RendCmpService {

  constructor(
    @Inject(REND_CMP_REPOSITORY)
    private readonly repo: IRendCmpRepository,
  ) {}

  findAll(): Promise<RendCmp[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<RendCmp> {
    const row = await this.repo.findOne(id);
    if (!row) throw new NotFoundException(`Campo ID ${id} no encontrado`);
    return row;
  }

  create(dto: CreateRendCmpDto): Promise<RendCmp> {
    return this.repo.create({ descripcion: dto.descripcion, campo: dto.campo });
  }

  async update(id: number, dto: UpdateRendCmpDto): Promise<RendCmp> {
    await this.findOne(id);
    return this.repo.update(id, { descripcion: dto.descripcion, campo: dto.campo });
  }

  async remove(id: number): Promise<{ affected: number }> {
    await this.findOne(id);
    return this.repo.remove(id);
  }
}