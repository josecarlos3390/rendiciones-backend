import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IProvRepository, PROV_REPOSITORY } from './repositories/prov.repository.interface';
import { CreateProvDto } from './dto/create-prov.dto';

@Injectable()
export class ProvService {
  constructor(
    @Inject(PROV_REPOSITORY)
    private readonly repo: IProvRepository,
  ) {}

  findAll() { return this.repo.findAll(); }

  async findByNit(nit: string) {
    return this.repo.findByNit(nit) ?? null;
  }

  async findByCodigo(codigo: string) {
    return this.repo.findByCodigo(codigo) ?? null;
  }

  /** Busca por NIT — si no existe lo crea y lo devuelve */
  async findOrCreate(dto: CreateProvDto) {
    const existing = await this.repo.findByNit(dto.nit);
    if (existing) return existing;
    return this.repo.create({ ...dto, tipo: dto.tipo ?? 'PL' });
  }

  async create(dto: CreateProvDto) {
    const exists = await this.repo.findByNit(dto.nit);
    if (exists) throw new ConflictException(`El NIT "${dto.nit}" ya está registrado`);
    return this.repo.create({ ...dto, tipo: dto.tipo ?? 'PL' });
  }

  async remove(nit: string) {
    const exists = await this.repo.findByNit(nit);
    if (!exists) throw new NotFoundException(`NIT "${nit}" no encontrado`);
    return this.repo.remove(nit);
  }
}