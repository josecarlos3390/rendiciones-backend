import { RendPrctj } from "../interfaces/prctj.interface";
import { PrctjLineaDto } from "../dto/prctj.dto";

export const PRCTJ_REPOSITORY = "PRCTJ_REPOSITORY";

export interface IPrctjRepository {
  findByLinea(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<RendPrctj[]>;
  tieneDistribucion(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<boolean>;
  deleteByLinea(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<void>;
  insertLineas(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
    importe: number,
    lineas: PrctjLineaDto[],
  ): Promise<void>;
  deleteByRendicion(idRendicion: number): Promise<void>;
}
