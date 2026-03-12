import { RendD } from '../interfaces/rend-d.interface';
import { CreateRendDDto } from '../dto/create-rend-d.dto';
import { UpdateRendDDto } from '../dto/update-rend-d.dto';

export interface IRendDRepository {
  findByRendicion(idRendicion: number): Promise<RendD[]>;
  findOne(idRD: number): Promise<RendD | null>;
  create(idRendicion: number, idUsuario: number, dto: CreateRendDDto): Promise<RendD | null>;
  update(idRD: number, dto: UpdateRendDDto): Promise<{ affected: number }>;
  remove(idRD: number): Promise<{ affected: number }>;
}
