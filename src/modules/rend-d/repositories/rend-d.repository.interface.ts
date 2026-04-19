import { RendD } from "../interfaces/rend-d.interface";
import { CreateRendDDto } from "../dto/create-rend-d.dto";
import { UpdateRendDDto } from "../dto/update-rend-d.dto";

export interface IRendDRepository {
  findByRendicion(idRendicion: number, idUsuario: number): Promise<RendD[]>;
  findOne(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<RendD | null>;
  create(
    idRendicion: number,
    idUsuario: number,
    dto: CreateRendDDto,
  ): Promise<RendD | null>;
  update(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
    dto: UpdateRendDDto,
  ): Promise<{ affected: number }>;
  remove(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<{ affected: number }>;
  findHistorialClasificaciones(
    idUsuario: number,
    limit?: number,
  ): Promise<
    Array<{
      concepto: string;
      cuenta: string;
      norma: string | null;
      proyecto: string | null;
    }>
  >;
}
