export interface Permiso {
  U_IDUSUARIO:    number;
  U_IDPERFIL:     number;
  U_NOMBREPERFIL: string;
  // Campos enriquecidos del JOIN
  U_Login?:       string;
  U_NomUser?:     string;
}

export interface UsuarioSimple {
  U_IdU:      number;
  U_Login:    string;
  U_NomUser:  string;
  U_SuperUser?: number;
}