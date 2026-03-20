import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { IProvRepository, PROV_REPOSITORY } from './repositories/prov.repository.interface';
import { CreateProvDto } from './dto/create-prov.dto';

export interface UpdateProvData {
  nit?:         string;
  razonSocial?: string;
}

@Injectable()
export class ProvService {
  constructor(
    @Inject(PROV_REPOSITORY)
    private readonly repo: IProvRepository,
  ) {}

  findAll(tipo?: string) {
    return this.repo.findAll(tipo);
  }

  async create(dto: CreateProvDto) {
    // Evitar NIT duplicado dentro del mismo tipo
    if (dto.nit) {
      const exists = await this.repo.findByNit(dto.nit);
      if (exists && exists.U_TIPO === dto.tipo) {
        throw new ConflictException(`El NIT "${dto.nit}" ya está registrado como ${dto.tipo}`);
      }
    }
    return this.repo.create(dto);
  }

  async update(codigo: string, data: UpdateProvData) {
    const exists = await this.repo.findByCodigo(codigo);
    if (!exists) throw new NotFoundException(`Código "${codigo}" no encontrado`);
    return this.repo.updateByCodigo(codigo, data);
  }

  async remove(codigo: string) {
    const exists = await this.repo.findByCodigo(codigo);
    if (!exists) throw new NotFoundException(`Código "${codigo}" no encontrado`);
    return this.repo.remove(codigo);
  }
}