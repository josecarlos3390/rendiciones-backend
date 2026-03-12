import { RendM } from '../interfaces/rend-m.interface';
import { CreateRendMDto } from '../dto/create-rend-m.dto';
import { UpdateRendMDto } from '../dto/update-rend-m.dto';

export interface IRendMRepository {
  findAll(): Promise<RendM[]>;
  findByUser(idUsuario: string): Promise<RendM[]>;
  findOne(id: number): Promise<RendM | null>;
  create(dto: CreateRendMDto, idUsuario: string, nomUsuario: string, nombrePerfil: string): Promise<RendM | null>;
  update(id: number, dto: UpdateRendMDto): Promise<{ affected: number }>;
  remove(id: number): Promise<{ affected: number }>;
}
