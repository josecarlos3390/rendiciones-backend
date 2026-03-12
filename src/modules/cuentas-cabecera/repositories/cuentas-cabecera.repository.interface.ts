import { CuentaCabecera } from '../interfaces/cuenta-cabecera.interface';
import { CreateCuentaCabeceraDto } from '../dto/create-cuenta-cabecera.dto';

export interface ICuentasCabeceraRepository {
  findAll(): Promise<CuentaCabecera[]>;
  findByPerfil(idPerfil: number): Promise<CuentaCabecera[]>;
  create(dto: CreateCuentaCabeceraDto): Promise<CuentaCabecera>;
  remove(idPerfil: number, cuentaSys: string): Promise<{ affected: number }>;
  exists(idPerfil: number, cuentaSys: string): Promise<boolean>;
}
