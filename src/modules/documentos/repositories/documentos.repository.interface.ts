import { Documento } from '../interfaces/documento.interface';
import { CreateDocumentoDto } from '../dto/create-documento.dto';
import { UpdateDocumentoDto } from '../dto/update-documento.dto';

export interface IDocumentosRepository {
  findAll(): Promise<Documento[]>;
  findByPerfil(codPerfil: number): Promise<Documento[]>;
  findOne(id: number): Promise<Documento | null>;
  create(dto: CreateDocumentoDto): Promise<Documento>;
  update(id: number, dto: UpdateDocumentoDto): Promise<Documento>;
  remove(id: number): Promise<{ affected: number }>;
}
