import { Perfil } from '../interfaces/perfil.interface';
import { CreatePerfilDto } from '../dto/create-perfil.dto';
import { UpdatePerfilDto } from '../dto/update-perfil.dto';

export interface IPerfilesRepository {
  findAll(): Promise<Perfil[]>;
  findOne(id: number): Promise<Perfil | null>;
  create(dto: CreatePerfilDto): Promise<Perfil | null>;
  update(id: number, dto: UpdatePerfilDto): Promise<{ affected: number }>;
  remove(id: number): Promise<{ affected: number }>;
}
