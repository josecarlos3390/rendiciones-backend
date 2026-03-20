import { Prov } from '../interfaces/prov.interface';
import { CreateProvDto } from '../dto/create-prov.dto';

export const PROV_REPOSITORY = 'PROV_REPOSITORY';

export interface IProvRepository {
  findAll(tipo?: string):                                    Promise<Prov[]>;
  findByCodigo(codigo: string):                             Promise<Prov | null>;
  findByNit(nit: string):                                   Promise<Prov | null>;
  getNextCodigo(tipo: string):                              Promise<string>;
  create(dto: CreateProvDto):                               Promise<Prov>;
  updateByCodigo(codigo: string, data: { nit?: string; razonSocial?: string }): Promise<{ affected: number }>;
  remove(codigo: string):                                   Promise<{ affected: number }>;
}