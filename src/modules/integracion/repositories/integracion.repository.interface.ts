export interface RendSync {
  U_IdSync: number;
  U_IdRendicion: number;
  U_Estado: string;
  U_NroDocERP: string | null;
  U_FechaSync: string | null;
  U_LoginAdmin: string | null;
  U_Mensaje: string | null;
  U_Intento: number;
}

export interface RendicionPendiente {
  U_IdRendicion: number;
  U_IdUsuario: string;
  U_NomUsuario: string;
  U_NombrePerfil: string;
  U_Objetivo: string;
  U_FechaIni: string;
  U_FechaFinal: string;
  U_Monto: number;
  U_Estado: number;
}

export interface IIntegracionRepository {
  findByRendicion(idRendicion: number): Promise<RendSync[]>;
  findPendientes(): Promise<RendicionPendiente[]>;
  findPendientesByAprobador(
    loginAprob: string,
    cascada: boolean,
  ): Promise<RendicionPendiente[]>;
  findMisRendiciones(idUsuario: string): Promise<RendicionPendiente[]>;
  countPendientes(): Promise<number>;
  countPendientesByAprobador(
    loginAprob: string,
    cascada: boolean,
  ): Promise<number>;
  create(data: {
    idRendicion: number;
    estado: string;
    nroDocERP?: string;
    loginAdmin: string;
    mensaje?: string;
    intento: number;
  }): Promise<RendSync>;
}

export const INTEGRACION_REPOSITORY = "INTEGRACION_REPOSITORY";
