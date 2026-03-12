import { Permiso, UsuarioSimple } from '../interfaces/permiso.interface';
import { CreatePermisoDto } from '../dto/create-permiso.dto';

export interface IPermisosRepository {
  findUsuarios(): Promise<UsuarioSimple[]>;
  findByUsuario(idUsuario: number): Promise<Permiso[]>;
  create(dto: CreatePermisoDto, nombrePerfil: string): Promise<Permiso>;
  remove(idUsuario: number, idPerfil: number): Promise<{ affected: number }>;

}