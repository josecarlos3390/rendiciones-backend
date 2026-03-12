import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { IDocumentosRepository } from './repositories/documentos.repository.interface';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Injectable()
export class DocumentosService {
  private readonly logger = new Logger(DocumentosService.name);

  constructor(
    @Inject('DOCUMENTOS_REPOSITORY')
    private readonly repo: IDocumentosRepository,
  ) {}

  findAll()                       { return this.repo.findAll(); }
  findByPerfil(codPerfil: number) { return this.repo.findByPerfil(codPerfil); }

  async findOne(id: number) {
    const doc = await this.repo.findOne(id);
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  async create(dto: CreateDocumentoDto) {
    const result = await this.repo.create(dto);
    this.logger.log(`Documento creado: ${result.U_IdDocumento} - ${result.U_TipDoc}`);
    return result;
  }

  async update(id: number, dto: UpdateDocumentoDto) {
    await this.findOne(id);
    const result = await this.repo.update(id, dto);
    this.logger.log(`Documento actualizado: ${id}`);
    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.repo.remove(id);
  }
}
