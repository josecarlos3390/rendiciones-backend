export interface JwtPayload {
  sub:        number;   // REND_U.U_IdU
  username:   string;   // REND_U.U_Login
  name:       string;   // REND_U.U_NomUser
  role:       string;   // 'ADMIN' | 'USER'  (derivado de U_SuperUser)
  appRend:    string;   // REND_U.U_AppRend  — acceso a rendiciones
  appConf:    string;   // REND_U.U_AppConf  — acceso a configuracion
  iat?:       number;
  exp?:       number;
}
