export interface CuentaLista {
  U_IdPerfil:      number;
  U_CuentaSys:     string;
  U_Cuenta:        string;
  U_NombreCuenta:  string;
  U_Relevante:     string;
}

// Vista enriquecida con nombre del perfil (JOIN)
export interface CuentaListaDetalle extends CuentaLista {
  U_NombrePerfil?: string;
}
