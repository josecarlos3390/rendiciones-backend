export interface RendM {
  U_IdRendicion: number;
  U_IdUsuario: string;
  U_IdPerfil: number;
  U_NomUsuario: string;
  U_NombrePerfil: string;
  U_Preliminar: string;
  U_Estado: number;
  U_Cuenta: string;
  U_NombreCuenta: string;
  U_Empleado: string;
  U_NombreEmpleado: string;
  U_FechaIni: string; // TIMESTAMP — se devuelve como string ISO
  U_FechaFinal: string;
  U_Monto: number;
  U_Objetivo: string;
  U_FechaCreacion: string;
  U_FechaMod: string;
  U_AUXILIAR1: string;
  U_AUXILIAR2: string;
  U_AUXILIAR3: string;
}

export interface RendicionStats {
  total: number;
  abiertas: number;
  enviadas: number;
  aprobadas: number;
  cerradas: number;
  sincronizadas: number;
  montoTotal: number;
  totalGlobal?: number;
  montoGlobal?: number;
}
