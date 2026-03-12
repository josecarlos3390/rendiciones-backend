export interface Perfil {
  U_CodPerfil:      number;
  U_NombrePerfil:   string;
  U_Trabaja:        string;   // '0' moneda local BS, '1' USD, etc.
  U_Per_CtaBl:      number;   // 0 = NO, 1 = SI
  U_PRO_Texto:      string;   // texto filtro proveedores
  U_PRO_CAR:        string;   // caracteristica proveedor: TODOS, EMPIEZA, etc.
  U_CUE_CAR:        string;   // caracteristica cuenta
  U_CUE_Texto:      string;   // texto filtro cuenta
  U_EMP_CAR:        string;   // caracteristica empleado
  U_EMP_TEXTO:      string;   // texto filtro empleado
  U_ControlPartida: number;
  U_CntLineas:      number;   // lineas por pagina
  U_Bolivianos:     number;
  U_SUCURSAL:       number;
  U_REP1:           string;
  U_REP2:           string;
}
