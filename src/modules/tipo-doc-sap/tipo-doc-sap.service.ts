import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { TipoDocSapRepository, CreateTipoDocSapDto, UpdateTipoDocSapDto } from './repositories/tipo-doc-sap.hana.repository';

@Injectable()
export class TipoDocSapService {
  constructor(private readonly repo: TipoDocSapRepository) {}

  findAll()      { return this.repo.findAll(); }
  findActivos()  { return this.repo.findActivos(); }

  async findOne(idTipo: number) {
    const item = await this.repo.findOne(idTipo);
    if (!item) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    return item;
  }

  async create(dto: CreateTipoDocSapDto) {
    const exists = await this.repo.exists(dto.idTipo);
    if (exists) throw new ConflictException(`El código SAP ${dto.idTipo} ya existe`);
    return this.repo.create(dto);
  }

  async update(idTipo: number, dto: UpdateTipoDocSapDto) {
    const exists = await this.repo.exists(idTipo);
    if (!exists) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    await this.repo.update(idTipo, dto);
    return this.repo.findOne(idTipo);
  }

  async remove(idTipo: number) {
    const exists = await this.repo.exists(idTipo);
    if (!exists) throw new NotFoundException(`Tipo de documento ${idTipo} no encontrado`);
    return this.repo.remove(idTipo);
  }
}