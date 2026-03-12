export interface Documento {
  U_IdDocumento:   number;
  U_CodPerfil:     number;
  U_TipDoc:        string;   // nombre del tipo de documento (ej: "Factura")
  U_EXENTOpercent: number;
  U_IdTipoDoc:     number;   // código SAP (ej: 1, 4, 10)
  U_TipoCalc:      string;   // 'G' Grossing Up | 'N' Normal
  U_IVApercent:    number | null;
  U_IVAcuenta:     string | null;
  U_ITpercent:     number | null;
  U_ITcuenta:      string | null;
  U_IUEpercent:    number | null;
  U_IUEcuenta:     string | null;
  U_RCIVApercent:  number | null;
  U_RCIVAcuenta:   string | null;
  U_CTAEXENTO:     string;
  U_TASA:          number | null;
  U_ICE:           number;
  // JOIN
  U_NombrePerfil?: string;
}
