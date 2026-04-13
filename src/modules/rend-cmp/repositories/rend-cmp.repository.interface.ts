export interface RendCmp {
  U_IdCampo:     number;
  U_Descripcion: string;
  U_Campo:       string;
}

/**
 * Mapeo de campos UDF para SAP JournalEntryLines.
 * Las claves son los U_IdCampo de REND_CMP.
 * Los valores son los nombres reales de los campos UDF en SAP (U_Campo).
 * 
 * IDs de campo según REND_CMP:
 * 1: Tipo de Documento
 * 2: Codi Formulario Poliza
 * 3: Fecha Factura
 * 4: Numero Tramite de Importacion
 * 5: Numero Poliza de Importacion
 * 6: NIT
 * 7: Razon Social
 * 8: Importe
 * 9: Codi de Control
 * 10: Ice
 * 11: Exento
 * 12: Numero de Autorizacion
 * 13: Boleto BSP
 * 14: Numero de Factura
 * 15: Descuento BR
 * 16: Tasa Cero
 * 100: Tasa
 * 101: Codigo unico factura (B_cuf)
 * 102: gift card
 */
export type SapFieldMapping = Record<number, string>;

export interface IRendCmpRepository {
  findAll():                                    Promise<RendCmp[]>;
  findOne(id: number):                          Promise<RendCmp | null>;
  create(data: { descripcion: string; campo: string }): Promise<RendCmp>;
  update(id: number, data: { descripcion?: string; campo?: string }): Promise<RendCmp | null>;
  remove(id: number):                           Promise<{ affected: number }>;
  /** 
   * Obtiene el mapeo de campos para SAP.
   * Retorna un mapa donde la clave es U_IdCampo y el valor es U_Campo (con prefijo U_).
   */
  getFieldMapping(): Promise<SapFieldMapping>;
}

export const REND_CMP_REPOSITORY = 'REND_CMP_REPOSITORY';
