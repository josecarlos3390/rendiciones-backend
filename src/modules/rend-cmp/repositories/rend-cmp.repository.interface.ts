export interface RendCmp {
  U_IdCampo:     number;
  U_Descripcion: string;
  U_Campo:       string;
}

export interface IRendCmpRepository {
  findAll():                                    Promise<RendCmp[]>;
  findOne(id: number):                          Promise<RendCmp | null>;
  create(data: { descripcion: string; campo: string }): Promise<RendCmp>;
  update(id: number, data: { descripcion?: string; campo?: string }): Promise<RendCmp | null>;
  remove(id: number):                           Promise<{ affected: number }>;
}

export const REND_CMP_REPOSITORY = 'REND_CMP_REPOSITORY';