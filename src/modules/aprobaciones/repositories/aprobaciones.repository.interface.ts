import {
  Aprobacion,
  AprobacionConRendicion,
} from "./aprobaciones.hana.repository";

export const APROBACIONES_REPOSITORY = "APROBACIONES_REPOSITORY";

export interface IAprobacionesRepository {
  findByRendicion(idRendicion: number): Promise<Aprobacion[]>;
  createNiveles(
    niveles: Omit<Aprobacion, "U_Estado" | "U_FechaAprob" | "U_Comentario">[],
  ): Promise<void>;
  deleteByRendicion(idRendicion: number): Promise<void>;
  updateEstado(
    idRendicion: number,
    nivel: number,
    estado: "APROBADO" | "RECHAZADO",
    comentario?: string,
  ): Promise<void>;
  allApproved(idRendicion: number): Promise<boolean>;
  findPendientesParaAprobador(
    loginAprob: string,
  ): Promise<AprobacionConRendicion[]>;
  findPendientesNivel2(loginAprob: string): Promise<AprobacionConRendicion[]>;
  findPerfilesByAprobador(loginAprob: string): Promise<number[]>;
  countPendientes(loginAprob: string): Promise<number>;
  countPendientesNivel2(loginAprob: string): Promise<number>;
  resolverCadenaAprobadores(
    loginIniciador: string,
  ): Promise<{ login: string; nombre: string }[]>;
  recrearNiveles(
    idRendicion: number,
    niveles: Omit<Aprobacion, "U_Estado" | "U_FechaAprob" | "U_Comentario">[],
  ): Promise<void>;
  aprobarNivelConCabecera(
    idRendicion: number,
    nivel: number,
    comentario?: string,
  ): Promise<{ estadoFinal: "APROBADO" | "ENVIADO" }>;
  rechazarNivelConCabecera(
    idRendicion: number,
    nivel: number,
    comentario?: string,
  ): Promise<void>;
}
