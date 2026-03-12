import { CuentaLista, CuentaListaDetalle } from '../interfaces/cuenta-lista.interface';
import { CreateCuentaListaDto } from '../dto/create-cuenta-lista.dto';

export interface ICuentasListaRepository {
  findAll(): Promise<CuentaListaDetalle[]>;
  findByPerfil(idPerfil: number): Promise<CuentaLista[]>;
  create(dto: CreateCuentaListaDto): Promise<CuentaLista>;
  remove(idPerfil: number, cuentaSys: string): Promise<{ affected: number }>;
  existsByPerfilAndCuenta(idPerfil: number, cuentaSys: string): Promise<boolean>;
}
