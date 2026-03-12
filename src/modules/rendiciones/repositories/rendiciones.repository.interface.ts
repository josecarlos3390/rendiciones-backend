/**
 * Contrato que deben cumplir TODAS las implementaciones de repositorio.
 * El Service solo conoce esta interfaz — nunca la implementacion concreta.
 * Para agregar SQL Server: crear RendicionesSqlRepository que implemente esta interfaz.
 */
export interface IRendicionesRepository {
  findAll(): Promise<any[]>;
  findOne(id: number): Promise<any | null>;
  create(data: CreateRendicionData, userId: number): Promise<any>;
  update(id: number, data: Partial<CreateRendicionData>): Promise<{ affected: number }>;
  remove(id: number): Promise<{ affected: number }>;
}

export interface CreateRendicionData {
  descripcion:    string;
  monto:          number;
  fecha:          string;
  observaciones?: string;
}