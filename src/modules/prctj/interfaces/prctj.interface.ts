export interface RendPrctj {
  PRCT_RD_IDRD:        number;   // FK → REND_D.U_RD_IdRD
  PRCT_RD_RM_IDREND:   number;   // FK → REND_M.U_IdRendicion
  PRCT_RD_IDUSER:      number;   // FK → usuario
  PRCT_IDLINEA:        number;   // número de línea dentro del reparto (1, 2, 3...)
  PRCT_PORCENTAJE:     number;   // porcentaje asignado (suma debe ser 100)
  PRCT_MONTO:          number;   // monto calculado = importe * porcentaje / 100
  PRCT_RD_CUENTA:      string;   // cuenta contable para esta porción
  PRCT_RD_NOMCUENTA:   string;   // nombre de la cuenta
  PRCT_RD_N1:          string;   // dimensión 1 (centro de costo)
  PRCT_RD_N2:          string;   // dimensión 2
  PRCT_RD_N3:          string;   // dimensión 3
  PRCT_RD_N4:          string;   // dimensión 4
  PRCT_RD_N5:          string;   // dimensión 5
  PRCT_RD_PROYECTO:    string;   // proyecto SAP
  PRCT_RD_AUXILIAR1:   string;
  PRCT_RD_AUXILIAR2:   string;
  PRCT_RD_AUXILIAR3:   string;
  PRCT_RD_AUXILIAR4:   string;
}