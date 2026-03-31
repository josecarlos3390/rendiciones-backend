export interface RendSync {
  U_IdSync:      number;
  U_IdRendicion: number;
  U_Estado:      string;
  U_NroDocERP:   string | null;
  U_FechaSync:   string | null;
  U_LoginAdmin:  string | null;
  U_Mensaje:     string | null;
  U_Intento:     number;
}

export interface IIntegracionRepository {
  findByRendicion(idRendicion: number): Promise<RendSync[]>;
  findPendientes(): Promise<any[]>;
  findMisRendiciones(idUsuario: string): Promise<any[]>;
  countPendientes(): Promise<number>;
  create(data: {
    idRendicion: number;
    estado:      string;
    nroDocERP?:  string;
    loginAdmin:  string;
    mensaje?:    string;
    intento:     number;
  }): Promise<RendSync>;
}

export const INTEGRACION_REPOSITORY = 'INTEGRACION_REPOSITORY';