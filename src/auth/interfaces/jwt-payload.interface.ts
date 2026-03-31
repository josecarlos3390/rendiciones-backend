export interface JwtPayload {
  sub:        number;   // REND_U.U_IdU
  username:   string;   // REND_U.U_Login
  name:       string;   // REND_U.U_NomUser
  role:       string;   // 'ADMIN' | 'USER'  (derivado de U_SuperUser)
  appRend:    string;   // REND_U.U_AppRend  — acceso a rendiciones
  appConf:    string;   // REND_U.U_AppConf  — acceso a configuracion
  fijarSaldo: string;   // REND_U.U_FIJARSALDO — '1'=debe fijar monto, '0'=opcional
  genDocPre:  string;   // REND_U.U_GenDocPre — '1'=puede generar preliminar
  fijarNr:    string;   // REND_U.U_FIJARNR — '1'=normas preconfiguradas fijas
  nr1:        string;   // REND_U.U_NR1 — norma reparto 1 preconfigurada
  nr2:        string;   // REND_U.U_NR2 — norma reparto 2 preconfigurada
  nr3:        string;   // REND_U.U_NR3 — norma reparto 3 preconfigurada
  nomSup:     string;   // REND_U.U_NomSup — login del aprobador (vacío = nivel final)
  esAprobador: boolean;  // true si algún usuario tiene este login como U_NomSup
  iat?:       number;
  exp?:       number;
}