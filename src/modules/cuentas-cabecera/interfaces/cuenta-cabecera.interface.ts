export interface CuentaCabecera {
  U_IdPerfil:          number;
  U_CuentaSys:         string;
  U_CuentaFormatCode:  string;
  U_CuentaNombre:      string;
  U_CuentaAsociada:    string; // 'Y' | 'N'
  U_NombrePerfil?:     string; // del JOIN con REND_PERFIL
}
