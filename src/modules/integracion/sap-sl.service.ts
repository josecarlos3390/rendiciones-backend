import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RendM } from '../rend-m/interfaces/rend-m.interface';
import { RendD } from '../rend-d/interfaces/rend-d.interface';
import { RendPrctj } from '../prctj/interfaces/prctj.interface';
import { SapFieldMapping } from '../rend-cmp/repositories/rend-cmp.repository.interface';

interface SlSession {
  cookie:    string;
  sessionId: string;
}

/**
 * Línea de asiento contable con campos UDF dinámicos.
 * Los campos UDF se asignan dinámicamente según el mapeo de SapFieldMapping.
 */
interface JournalLine {
  AccountCode?:  string;
  ShortName?:    string;
  Credit:        number;
  Debit:         number;
  LineMemo?:     string;  // Glosa de la línea
  // Campos UDF dinámicos - se asignan en runtime según SapFieldMapping
  [udfField: string]: string | number | undefined;
  // Dimensiones SAP (Cost Accounting / Profit Center)
  CostingCode?:  string;   // N1 - Centro de Costo
  CostingCode2?: string;   // N2 - Dimensión 2
  CostingCode3?: string;   // N3 - Dimensión 3
  CostingCode4?: string;   // N4 - Dimensión 4
  CostingCode5?: string;   // N5 - Dimensión 5
  ProjectCode?:  string;   // Proyecto
}

@Injectable()
export class SapSlService {
  private readonly logger = new Logger(SapSlService.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('SL_BASE_URL', 'https://hanaroda:50000/b1s/v1');
  }

  private get companyDb(): string {
    return this.config.get<string>('SL_COMPANY_DB', '');
  }

  private async fetchSl(url: string, options: RequestInit, session?: SlSession): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> ?? {}),
    };
    if (session) headers['Cookie'] = session.cookie;
    return fetch(url, { ...options, headers });
  }

  async login(sapUser: string, sapPassword: string): Promise<SlSession> {
    const url  = `${this.baseUrl}/Login`;

    // Body exacto que acepta este SAP B1 Service Layer
    const body = JSON.stringify({
      CompanyDB: this.companyDb,
      UserName:  sapUser,
      Password:  sapPassword,
    });

    this.logger.log(`SAP SL Login → ${url} (user: ${sapUser}, company: ${this.companyDb})`);

    let res: Response;
    try {
      res = await this.fetchSl(url, { method: 'POST', body });
    } catch (err: any) {
      throw new InternalServerErrorException(`No se pudo conectar al Service Layer (${url}): ${err.message}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new InternalServerErrorException(`SAP SL Login fallido (${res.status}): ${text}`);
    }

    const setCookie = res.headers.get('set-cookie') ?? '';
    const sessionId = (setCookie.match(/B1SESSION=([^;]+)/) ?? [])[1] ?? '';
    const cookie    = `B1SESSION=${sessionId}; CompanyDB=${this.companyDb}`;

    if (!sessionId) {
      throw new InternalServerErrorException('SAP SL Login: no se recibió B1SESSION en la respuesta');
    }

    this.logger.log(`SAP SL Login OK — sessionId: ${sessionId.slice(0, 8)}...`);
    return { cookie, sessionId };
  }

  async logout(session: SlSession): Promise<void> {
    try {
      await this.fetchSl(`${this.baseUrl}/Logout`, { method: 'POST', body: '{}' }, session);
      this.logger.log('SAP SL Logout OK');
    } catch (err: any) {
      this.logger.warn(`SAP SL Logout error (ignorado): ${err.message}`);
    }
  }

  /**
   * Construye el payload JournalVoucher a partir de REND_M + REND_D.
   *
   * Por cada documento (REND_D) se generan estas líneas:
   *
   *  DÉBITO  1 — Cuenta de gasto principal   (U_RD_Cuenta,   U_RD_Importe)
   *  DÉBITO  2 — Crédito fiscal IVA           (U_CuentaIVA,   U_MontoIVA)   — si > 0
   *  CRÉDITO 1 — Retención IT                 (U_CuentaIT,    U_MontoIT)    — si > 0
   *  CRÉDITO 2 — Retención RCIVA              (U_CuentaRCIVA, U_MontoRCIVA) — si > 0
   *  CRÉDITO 3 — Retención IUE                (U_CuentaIUE,   U_MontoIUE)   — si > 0
   *
   *  CRÉDITO FINAL — Cuenta cabecera (REND_M.U_Cuenta o ShortName si cuenta asociada a empleado)
   *
   * Cuadratura garantizada:
   *   Σ Débitos = Σ Créditos retenciones + Contrapartida final
   *   totalDebitoNeto = Σ(importe + iva - it - rciva - iue)  por cada documento
   *
   * Nota: U_RD_Exento es informativo — va en el campo U_EXENTO de la línea
   * principal pero NO genera línea contable separada.
   *
   * @param fieldMapping - Mapeo de nombres de campos UDF según configuración en REND_CMP
   */
  buildJournalPayload(
    rend:              RendM,
    detalles:          RendD[],
    distribucionesMap: Map<number, RendPrctj[]> = new Map(),
    tasaCambio?:       number,  // Tasa BOB → USD (solo cuando BolivianosEs=SISTEMA)
    fieldMapping?:     SapFieldMapping, // Mapeo dinámico de campos UDF
  ): object {
    const fechaCabecera = rend.U_FechaFinal?.substring(0, 10)
                       ?? new Date().toISOString().substring(0, 10);
    const memo          = `[R] ${rend.U_Objetivo} - N° ${rend.U_IdRendicion}`;
    const lines: JournalLine[] = [];

    this.logger.debug(`buildJournalPayload - Rendición ${rend.U_IdRendicion}: ${detalles.length} detalles recibidos`);
    this.logger.debug(`buildJournalPayload - Rendición ${rend.U_IdRendicion}: U_CuentaCabecera=${rend.U_Cuenta}, U_Empleado=${rend.U_Empleado}`);

    // Acumulador para la línea de contrapartida final
    let totalDebitoNeto = 0;

    // Helper para convertir montos según tasa de cambio
    const conv = (monto: number): number => {
      if (!tasaCambio || tasaCambio <= 0) return monto;
      return Math.round((monto / tasaCambio) * 100) / 100;
    };

    // Helper para construir campos UDF dinámicos usando U_IdCampo
    const fm = fieldMapping;
    const udf = (values: Record<number, string | number>): Record<string, string | number> => {
      if (!fm) return {} as Record<string, string | number>;
      const result: Record<string, string | number> = {};
      for (const [idCampo, val] of Object.entries(values)) {
        const fieldName = fm[Number(idCampo)];
        if (fieldName) result[fieldName] = val as string | number;
      }
      return result;
    };

    // Validar que todos los detalles tengan cuenta contable asignada
    const detallesSinCuenta = detalles.filter(d => !d.U_RD_Cuenta);
    if (detallesSinCuenta.length > 0) {
      const ids = detallesSinCuenta.map(d => d.U_RD_IdRD).join(', ');
      const mensaje = `No se puede sincronizar: ${detallesSinCuenta.length} detalle(s) sin cuenta contable asignada (ID: ${ids}). Por favor, asigne una cuenta contable a todos los documentos de la rendición.`;
      this.logger.warn(mensaje);
      throw new Error(mensaje);
    }

    let lineasProcesadas = 0;
    for (const d of detalles) {
      this.logger.debug(`Procesando detalle U_RD_IdRD=${d.U_RD_IdRD}, U_RD_Cuenta=${d.U_RD_Cuenta}, U_RD_Importe=${d.U_RD_Importe}`);
      lineasProcesadas++;

      const { base, primeraLinea } = this.buildBaseFields(d, rend, fieldMapping);

      const importe    = d.U_RD_Importe    ?? 0;
      const total      = d.U_RD_Total      ?? 0;
      const impRet     = d.U_RD_ImpRet     ?? 0;
      const montoIVA   = d.U_MontoIVA      ?? 0;
      const montoIT    = d.U_MontoIT       ?? 0;
      const montoRCIVA = d.U_MontoRCIVA    ?? 0;
      const montoIUE   = d.U_MontoIUE      ?? 0;
      const exento     = d.U_RD_Exento     ?? 0;

      // ── Detectar Grossing Up (GU) en recibos ────────────────────────────
      const esRecibo = [4, 10].includes(Number(d.U_RD_IdTipoDoc));
      const esGU     = esRecibo && total > importe && impRet > 0;
      const bruto    = esGU ? total : importe;

      // ── Verificar si la línea tiene distribución PRCTJ ──────────────────
      const distribuciones = distribucionesMap.get(d.U_RD_IdRD) ?? [];
      const tieneDistrib   = distribuciones.length > 0;

      // Preparar base sin campos de primera línea (TIPODOC, CUF) para líneas adicionales
      const baseSinPrimeraLinea = { ...base };
      
      // Glosa/Concepto para todas las líneas del documento
      const glosa = d.U_RD_Concepto?.trim() || rend.U_Objetivo || '';

      // Dimensiones del detalle - solo en la primera línea de cada documento
      const dimensionesPrimeraLinea = {
        ...(d.U_RD_N1 ? { CostingCode: d.U_RD_N1 } : {}),
        ...(d.U_RD_N2 ? { CostingCode2: d.U_RD_N2 } : {}),
        ...(d.U_RD_N3 ? { CostingCode3: d.U_RD_N3 } : {}),
        ...(d.U_RD_N4 ? { CostingCode4: d.U_RD_N4 } : {}),
        ...(d.U_RD_N5 ? { CostingCode5: d.U_RD_N5 } : {}),
        ...(d.U_RD_Proyecto ? { ProjectCode: d.U_RD_Proyecto } : {}),
      };

      // ── DÉBITO 1: cuenta(s) de gasto ────────────────────────────────────
      if (!tieneDistrib) {
        const debitoGasto = esGU ? bruto : (bruto - montoIVA);
        lines.push({
          ...base,                // Campos base (todas las líneas)
          ...primeraLinea,        // Campos solo primera línea: TIPODOC, CUF
          ...dimensionesPrimeraLinea, // Dimensiones N1-N5 y Proyecto
          AccountCode: d.U_RD_Cuenta,
          Debit:       conv(debitoGasto),
          Credit:      0,
          LineMemo:    glosa,
          ...udf({ 8: bruto, 11: exento }), // 8=Importe, 11=Exento
        });
        totalDebitoNeto += debitoGasto;
      } else {
        // Cuando hay distribución, cada línea debe llevar los campos de la factura
        // como si fuera la primera línea del documento (CUF, dimensiones, etc.)
        const baseDistrib = esGU ? bruto : importe;
        for (const dist of distribuciones) {
          const montoTramo = Math.round(baseDistrib * dist.PRCT_PORCENTAJE / 100 * 100) / 100;
          const debitoTramo = esGU ? montoTramo : (montoTramo - (montoIVA * dist.PRCT_PORCENTAJE / 100));

          // TODAS las líneas de distribución llevan TIPODOC, CUF y dimensiones
          // para que SAP pueda rastrear cada línea como parte de la misma factura
          const baseLineaDistrib = { ...base, ...primeraLinea };

          // Dimensiones de la distribución (o del detalle original si no hay en distribución)
          const dimsDistribucion = {
            ...(dist.PRCT_RD_N1      ? { CostingCode:   dist.PRCT_RD_N1 }      : (d.U_RD_N1 ? { CostingCode: d.U_RD_N1 } : {})),
            ...(dist.PRCT_RD_N2     ? { CostingCode2:  dist.PRCT_RD_N2 }     : (d.U_RD_N2 ? { CostingCode2: d.U_RD_N2 } : {})),
            ...(dist.PRCT_RD_N3     ? { CostingCode3:  dist.PRCT_RD_N3 }     : (d.U_RD_N3 ? { CostingCode3: d.U_RD_N3 } : {})),
            ...(dist.PRCT_RD_N4     ? { CostingCode4:  dist.PRCT_RD_N4 }     : (d.U_RD_N4 ? { CostingCode4: d.U_RD_N4 } : {})),
            ...(dist.PRCT_RD_N5     ? { CostingCode5:  dist.PRCT_RD_N5 }     : (d.U_RD_N5 ? { CostingCode5: d.U_RD_N5 } : {})),
            ...(dist.PRCT_RD_PROYECTO ? { ProjectCode:  dist.PRCT_RD_PROYECTO } : (d.U_RD_Proyecto ? { ProjectCode: d.U_RD_Proyecto } : {})),
          };

          lines.push({
            ...baseLineaDistrib,   // Base + TIPODOC + CUF (todas las líneas)
            AccountCode: dist.PRCT_RD_CUENTA || d.U_RD_Cuenta,
            Debit:       conv(debitoTramo),
            Credit:      0,
            LineMemo:    glosa,
            ...dimsDistribucion,   // Dimensiones de distribución o del detalle
            ...udf({ 8: montoTramo, 11: Math.round(exento * dist.PRCT_PORCENTAJE / 100 * 100) / 100 }), // 8=Importe, 11=Exento
          });
          totalDebitoNeto += debitoTramo;
        }
      }

      // Preparar base mínima para líneas de impuestos/retenciones
      // Estas líneas NO llevan datos del documento (CUF, TIPODOC, NIT, Fecha, etc.)
      const baseImpuestos: Record<string, string | number> = {
        U_ESTADOFC: 'V',
        U_IEHD: 0,
        U_IPJ: 0,
        U_OP_EXENTO: 0,
      };
      
      // Agregar campos UDF de mapeo si existen
      if (fieldMapping) {
        // Solo campos de control del sistema, NO campos del documento
        if (fieldMapping[8]) baseImpuestos[fieldMapping[8]] = 0; // Importe (se sobreescribe)
      }

      // ── DÉBITO 2: crédito fiscal IVA ───────────────────────────────────
      if (montoIVA > 0 && d.U_CuentaIVA) {
        lines.push({
          ...baseImpuestos, // Solo campos mínimos del sistema
          AccountCode: d.U_CuentaIVA,
          Debit:       conv(montoIVA),
          Credit:      0,
          LineMemo:    glosa,
          ...udf({ 8: montoIVA }), // 8=Importe
        });
        totalDebitoNeto += montoIVA;
      }

      // ── CRÉDITO 1: retención IT ───────────────────────────────────────
      if (montoIT > 0 && d.U_CuentaIT) {
        lines.push({
          ...baseImpuestos, // Solo campos mínimos del sistema
          AccountCode: d.U_CuentaIT,
          Debit:       0,
          Credit:      conv(montoIT),
          LineMemo:    glosa,
          ...udf({ 8: montoIT }), // 8=Importe
        });
        totalDebitoNeto -= montoIT;
      }

      // ── CRÉDITO 2: retención RCIVA ────────────────────────────────────
      if (montoRCIVA > 0 && d.U_CuentaRCIVA) {
        lines.push({
          ...baseImpuestos, // Solo campos mínimos del sistema
          AccountCode: d.U_CuentaRCIVA,
          Debit:       0,
          Credit:      conv(montoRCIVA),
          LineMemo:    glosa,
          ...udf({ 8: montoRCIVA }), // 8=Importe
        });
        totalDebitoNeto -= montoRCIVA;
      }

      // ── CRÉDITO 3: retención IUE ──────────────────────────────────────
      if (montoIUE > 0 && d.U_CuentaIUE) {
        lines.push({
          ...baseImpuestos, // Solo campos mínimos del sistema
          AccountCode: d.U_CuentaIUE,
          Debit:       0,
          Credit:      conv(montoIUE),
          LineMemo:    glosa,
          ...udf({ 8: montoIUE }), // 8=Importe
        });
        totalDebitoNeto -= montoIUE;
      }

      // Nota: U_RD_Exento es INFORMATIVO — va en el campo EXENTO de la línea principal
    }

    // ── LÍNEA FINAL: contrapartida en cuenta cabecera ─────────────────────
    // Cuenta ASOCIADA a empleado → ShortName = U_Empleado (código empleado SAP)
    //   AccountCode debe OMITIRSE — SAP rechaza AccountCode vacío junto a ShortName
    // Cuenta NO ASOCIADA → AccountCode = U_Cuenta (código contable directo)
    // Construir campos UDF para línea final usando U_IdCampo
    const lineaFinalUdf: Record<string, string | number> = {};
    
    if (fieldMapping) {
      if (fieldMapping[7]) lineaFinalUdf[fieldMapping[7]] = rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || ''; // 7=Razon Social
      if (fieldMapping[3]) lineaFinalUdf[fieldMapping[3]] = fechaCabecera; // 3=Fecha Factura
      if (fieldMapping[14]) lineaFinalUdf[fieldMapping[14]] = 0; // 14=Numero de Factura
      if (fieldMapping[12]) lineaFinalUdf[fieldMapping[12]] = '0'; // 12=Numero de Autorizacion
      if (fieldMapping[5]) lineaFinalUdf[fieldMapping[5]] = '0'; // 5=Numero Poliza
      if (fieldMapping[11]) lineaFinalUdf[fieldMapping[11]] = 0; // 11=Exento
      if (fieldMapping[10]) lineaFinalUdf[fieldMapping[10]] = 0; // 10=ICE
      if (fieldMapping[8]) lineaFinalUdf[fieldMapping[8]] = Math.abs(totalDebitoNeto); // 8=Importe
      if (fieldMapping[1]) lineaFinalUdf[fieldMapping[1]] = 10; // 1=Tipo de Documento (10=SIN ASIGNAR)
      if (fieldMapping[15]) lineaFinalUdf[fieldMapping[15]] = 0; // 15=Descuento BR
      if (fieldMapping[13]) lineaFinalUdf[fieldMapping[13]] = 0; // 13=Boleto BSP
      if (fieldMapping[2]) lineaFinalUdf[fieldMapping[2]] = '0'; // 2=Codi Formulario Poliza
      if (fieldMapping[4]) lineaFinalUdf[fieldMapping[4]] = '0'; // 4=Numero Tramite
      if (fieldMapping[16]) lineaFinalUdf[fieldMapping[16]] = 0; // 16=Tasa Cero
      if (fieldMapping[6]) lineaFinalUdf[fieldMapping[6]] = ''; // 6=NIT
      if (fieldMapping[18]) lineaFinalUdf[fieldMapping[18]] = '0'; // 18=B_cuf
      // Campos adicionales
      lineaFinalUdf['U_ESTADOFC'] = 'V';
      lineaFinalUdf['U_IEHD'] = 0;
      lineaFinalUdf['U_IPJ'] = 0;
      lineaFinalUdf['U_OP_EXENTO'] = 0;
    } else {
      // Fallback si no hay mapeo
      Object.assign(lineaFinalUdf, {
        U_CARDNAME:  rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || '',
        U_FECHAFAC:  fechaCabecera,
        U_NUM_FACT:  0,
        U_NUMORDEN:  0,
        U_NUMPOL:    '0',
        U_EXENTO:    0,
        U_ICE:       0,
        U_IMPORTE:   Math.abs(totalDebitoNeto),
        U_TIPODOC:   10,
        U_DESCTOBR:  0,
        U_BOLBSP:    0,
        U_CODFORPI:  '0',
        U_NROTRAM:   '0',
        U_TASACERO:  0,
        U_ESTADOFC:  'V',
        U_NumDoc:    0,
        U_NumAuto:   '0',
        U_NIT:       '',
        U_IEHD:      0,
        U_IPJ:       0,
        U_TASAS:     0,
        U_OP_EXENTO: 0,
        U_B_cuf:     '0',
      });
    }

    const lineaFinalBase = {
      Debit:    0,
      Credit:   conv(Math.abs(totalDebitoNeto)),
      LineMemo: `[R] ${rend.U_Objetivo}`,
      ...lineaFinalUdf,
    };

    const lineaFinal: any = rend.U_Empleado?.trim()
      ? { ...lineaFinalBase, ShortName: rend.U_Empleado.trim() }
      : { ...lineaFinalBase, AccountCode: rend.U_Cuenta };

    lines.push(lineaFinal);

    this.logger.debug(`buildJournalPayload - Líneas generadas: ${lines.length} (detalles procesados: ${lineasProcesadas}, totalDebitoNeto: ${totalDebitoNeto})`);
    this.logger.debug(`buildJournalPayload - Primera línea: ${JSON.stringify(lines[0])}`);

    return {
      JournalVoucher: {
        JournalEntry: {
          ReferenceDate:     fechaCabecera,
          DueDate:           fechaCabecera,
          Memo:              memo,
          JournalEntryLines: lines,
        },
      },
    };
  }

  async crearAsientoPreliminar(session: SlSession, payload: object): Promise<string> {
    const url = `${this.baseUrl}/JournalVouchersService_Add`;
    this.logger.log(`SAP SL → POST ${url}`);
    this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

    let res: Response;
    try {
      res = await this.fetchSl(url, { method: 'POST', body: JSON.stringify(payload) }, session);
    } catch (err: any) {
      throw new InternalServerErrorException(`Error de red al llamar al Service Layer: ${err.message}`);
    }

    const body = await res.json().catch(() => ({})) as any;

    if (!res.ok) {
      const msg = body?.error?.message?.value ?? body?.error?.message ?? JSON.stringify(body);
      throw new InternalServerErrorException(`SAP SL JournalVouchersService_Add (${res.status}): ${msg}`);
    }

    // Extraer número de documento de varias posibles ubicaciones en la respuesta de SAP
    const absEntry = body?.AbsEntry 
                  ?? body?.value 
                  ?? body?.JournalVoucher?.AbsEntry
                  ?? body?.JournalEntry?.AbsEntry
                  ?? body?.AbsoluteEntry
                  ?? body?.JdtNum
                  ?? body?.TransId
                  ?? body?.DocEntry;
    
    const nroDoc = absEntry ? String(absEntry) : 'OK';
    
    // Log detallado para debugging
    this.logger.log(`SAP SL Asiento creado — AbsEntry: ${nroDoc}`);
    this.logger.debug(`SAP SL Respuesta completa: ${JSON.stringify(body)}`);
    
    return nroDoc;
  }

  // ── Helper privado ────────────────────────────────────────────────────────

  private buildBaseFields(
    d:    RendD,
    rend: RendM,
    fieldMapping?: SapFieldMapping,
  ): {
    base: Omit<JournalLine, 'AccountCode' | 'ShortName' | 'Debit' | 'Credit'>;
    primeraLinea: Record<string, string | number>;
  } {

    const fm = fieldMapping;

    // Fecha del documento individual; si no existe usar la fecha final de la rendición
    const fecha = d.U_RD_Fecha?.substring(0, 10)
               ?? rend.U_FechaFinal?.substring(0, 10)
               ?? new Date().toISOString().substring(0, 10);

    // RSocial: nombre del proveedor si existe, sino nombre del empleado o usuario
    const cardName = d.U_RD_Prov?.trim()
                  || rend.U_NombreEmpleado?.trim()
                  || rend.U_NomUsuario
                  || '';

    // NUM_FACT y NumDoc: número de factura/documento (U_RD_NumDocumento)
    const numDoc = Number(d.U_RD_NumDocumento ?? 0) || 0;

    // BOLBSP: número de boleto/recibo
    const bolBsp = numDoc;

    // NumAuto: SAP B1 tiene validaciones cruzadas según TIPODOC:
    const tipoDoc = d.U_RD_IdTipoDoc > 0 ? d.U_RD_IdTipoDoc : 10;
    let numAuto: string;
    if (tipoDoc === 4) {
      numAuto = '2';
    } else if (d.U_RD_NroAutor?.trim()) {
      numAuto = d.U_RD_NroAutor.trim();
    } else {
      numAuto = '0';
    }

    // B_cuf: CUF de la factura electrónica
    const cuf = d.U_CUF?.trim() || '0';

    // NIT: NIT del proveedor/cliente
    const nit = d.U_RD_NIT?.trim() || '';

    // Separar campos: base (todas las líneas) vs primeraLinea (solo primera línea del documento)
    const base: Record<string, string | number> = {};
    const primeraLinea: Record<string, string | number> = {};
    
    if (fm) {
      // === Campos que van en TODAS las líneas del documento ===
      // Campo 7: Razon Social / CARDNAME
      if (fm[7]) base[fm[7]] = cardName;
      // Campo 3: Fecha Factura
      if (fm[3]) base[fm[3]] = fecha;
      // Campo 14: Numero de Factura (también usado para NUM_FACT)
      if (fm[14]) base[fm[14]] = numDoc;
      // Campo 12: Numero de Autorizacion
      if (fm[12]) base[fm[12]] = numAuto;
      // Campo 13: Boleto BSP
      if (fm[13]) base[fm[13]] = bolBsp;
      // Campo 6: NIT
      if (fm[6]) base[fm[6]] = nit;
      // Campo 10: ICE
      if (fm[10]) base[fm[10]] = d.U_ICE ?? 0;
      // Campo 11: Exento
      if (fm[11]) base[fm[11]] = 0;
      // Campo 8: Importe (se sobreescribe en cada línea)
      if (fm[8]) base[fm[8]] = 0;
      // Campo 15: Descuento BR
      if (fm[15]) base[fm[15]] = d.U_RD_Descuento ?? 0;
      // Campo 16: Tasa Cero
      if (fm[16]) base[fm[16]] = d.U_RD_TasaCero ?? 0;
      // Campo 2: Codi Formulario Poliza
      if (fm[2]) base[fm[2]] = '0';
      // Campo 4: Numero Tramite
      if (fm[4]) base[fm[4]] = '0';
      // Campo 5: Numero Poliza
      if (fm[5]) base[fm[5]] = '0';
      // Campo 9: Codi de Control
      if (fm[9]) base[fm[9]] = '0';
      // Campo 17: Tasa
      if (fm[17]) base[fm[17]] = 0;
      // Campo 19: Gift card
      if (fm[19]) base[fm[19]] = '0';
      // Campo 20: RCIVA
      if (fm[20]) base[fm[20]] = 0;
      // Campos adicionales comunes
      base['U_ESTADOFC'] = 'V';
      base['U_IEHD'] = 0;
      base['U_IPJ'] = 0;
      base['U_OP_EXENTO'] = 0;

      // === Campos que solo van en la PRIMERA línea del documento ===
      // Campo 1: Tipo de Documento
      if (fm[1]) primeraLinea[fm[1]] = tipoDoc;
      // Campo 18: Codigo unico factura (B_cuf)
      if (fm[18]) primeraLinea[fm[18]] = cuf;
      
      return { base: base as any, primeraLinea };
    }

    // Fallback: campos por defecto (usando nombres más comunes)
    return {
      base: {
        U_CARDNAME:  cardName,
        U_FECHAFAC:  fecha,
        U_NUM_FACT:  numDoc,
        U_NUMORDEN:  0,
        U_NUMPOL:    '0',
        U_EXENTO:    0,
        U_ICE:       d.U_ICE ?? 0,
        U_DESCTOBR:  d.U_RD_Descuento ?? 0,
        U_BOLBSP:    bolBsp,
        U_CODFORPI:  '0',
        U_NROTRAM:   '0',
        U_TASACERO:  d.U_RD_TasaCero ?? 0,
        U_ESTADOFC:  'V',
        U_NumDoc:    numDoc,
        U_NumAuto:   numAuto,
        U_NIT:       nit,
        U_IEHD:      0,
        U_IPJ:       0,
        U_TASAS:     0,
        U_OP_EXENTO: 0,
      } as any,
      primeraLinea: {
        U_TIPODOC:   tipoDoc,
        U_B_cuf:     cuf,
      },
    };
  }

  // ── Métodos de conversión de moneda ───────────────────────────────────────

  /**
   * Obtener el tipo de cambio desde SAP Service Layer
   * 
   * @param session - Sesión de SAP Service Layer
   * @param moneda - Código de moneda (ej: 'USD')
   * @param fecha - Fecha en formato YYYY-MM-DD
   * @returns Tasa de cambio (cuántos BOB = 1 unidad de moneda)
   */
  async obtenerTasaCambio(
    session: SlSession,
    moneda: string,
    fecha: string,
  ): Promise<number> {
    // Formatear fecha de YYYY-MM-DD a YYYYMMDD
    const fechaFormateada = fecha.replace(/-/g, '');
    
    const url = `${this.baseUrl}/SBOBobService_GetCurrencyRate`;
    const body = JSON.stringify({
      Currency: moneda.toUpperCase(),
      Date: fechaFormateada,
    });

    this.logger.log(`Consultando tipo de cambio: ${moneda} en fecha ${fecha}`);

    const res = await this.fetchSl(url, { 
      method: 'POST', 
      body,
    }, session);

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new InternalServerErrorException(
        `Error al obtener tipo de cambio (${res.status}): ${text}`
      );
    }

    const data = await res.json();
    const tasa = data?.Rate ?? data?.value?.Rate;

    if (!tasa || tasa <= 0) {
      throw new InternalServerErrorException(
        `Tipo de cambio inválido para ${moneda} en fecha ${fecha}: ${tasa}`
      );
    }

    this.logger.log(`Tipo de cambio obtenido: ${tasa} BOB/${moneda}`);
    return tasa;
  }

  /**
   * Convertir monto de BOB a moneda local (USD) cuando BolivianosEs=SISTEMA
   * 
   * @param montoBOB - Monto en Bolivianos
   * @param tasaCambio - Tasa BOB → USD
   * @returns Monto convertido con 2 decimales
   */
  convertirAMonedaLocal(montoBOB: number, tasaCambio: number): number {
    if (!tasaCambio || tasaCambio <= 0) {
      return montoBOB; // Sin conversión si no hay tasa válida
    }
    
    // BOB → USD: dividir por tasa
    const convertido = montoBOB / tasaCambio;
    return Math.round(convertido * 100) / 100;
  }
}