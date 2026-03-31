import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RendM } from '../rend-m/interfaces/rend-m.interface';
import { RendD } from '../rend-d/interfaces/rend-d.interface';
import { RendPrctj } from '../prctj/interfaces/prctj.interface';

interface SlSession {
  cookie:    string;
  sessionId: string;
}

interface JournalLine {
  AccountCode:  string;
  ShortName?:   string;
  Credit:       number;
  Debit:        number;
  U_CARDNAME:   string;
  U_FECHAFAC:   string;
  U_NUM_FACT:   number;
  U_NUMORDEN:   number;
  U_NUMPOL:     string;
  U_EXENTO?:    number;
  U_ICE:        number;
  U_IMPORTE:    number;
  U_TIPODOC:    number;
  U_DESCTOBR:   number;
  U_BOLBSP:     number;
  U_CODFORPI:   string;
  U_NROTRAM:    string;
  U_TASACERO:   number;
  U_ESTADOFC:   string;
  U_NumDoc:     number;
  U_NumAuto:    string;
  U_NIT:        string;
  U_IEHD:       number;
  U_IPJ:        number;
  U_TASAS:      number;
  U_OP_EXENTO:  number;
  U_B_cuf:      string;
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
   */
  buildJournalPayload(
    rend:              RendM,
    detalles:          RendD[],
    distribucionesMap: Map<number, RendPrctj[]> = new Map(),
  ): object {
    const fechaCabecera = rend.U_FechaFinal?.substring(0, 10)
                       ?? new Date().toISOString().substring(0, 10);
    const memo          = `[R] ${rend.U_Objetivo} - N° ${rend.U_IdRendicion}`;
    const lines: JournalLine[] = [];

    // Acumulador para la línea de contrapartida final
    let totalDebitoNeto = 0;

    for (const d of detalles) {
      if (!d.U_RD_Cuenta) continue;   // sin cuenta asignada → saltar

      const base = this.buildBaseFields(d, rend);

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

      // ── DÉBITO 1: cuenta(s) de gasto ────────────────────────────────────
      // Sin distribución: una sola línea con la cuenta principal
      // Con distribución: N líneas — una por cada porcentaje, con su cuenta y dimensiones
      if (!tieneDistrib) {
        // Comportamiento original
        const debitoGasto = esGU ? bruto : (bruto - montoIVA);
        lines.push({
          ...base,
          AccountCode: d.U_RD_Cuenta,
          Debit:       debitoGasto,
          Credit:      0,
          U_IMPORTE:   bruto,
          U_EXENTO:    exento,
        });
        totalDebitoNeto += debitoGasto;
      } else {
        // Con distribución: generar una línea de débito por cada tramo
        // El importe base es U_RD_Importe (el gasto sin retenciones)
        // En GU el porcentaje se aplica sobre el bruto; en GD sobre el importe
        const baseDistrib = esGU ? bruto : importe;

        for (const dist of distribuciones) {
          const montoTramo = Math.round(baseDistrib * dist.PRCT_PORCENTAJE / 100 * 100) / 100;
          const debitoTramo = esGU ? montoTramo : (montoTramo - (montoIVA * dist.PRCT_PORCENTAJE / 100));

          lines.push({
            ...base,
            // Usar la cuenta y dimensiones de la distribución
            AccountCode: dist.PRCT_RD_CUENTA || d.U_RD_Cuenta,
            Debit:       debitoTramo,
            Credit:      0,
            U_IMPORTE:   montoTramo,
            U_EXENTO:    Math.round(exento * dist.PRCT_PORCENTAJE / 100 * 100) / 100,
            // Dimensiones propias de esta porción
            ...(dist.PRCT_RD_N1     ? { U_COSTCENTER: dist.PRCT_RD_N1 } : {}),
            ...(dist.PRCT_RD_PROYECTO ? { U_PROYECTO: dist.PRCT_RD_PROYECTO } : {}),
          });
          totalDebitoNeto += debitoTramo;
        }
      }

      // ── DÉBITO 2: crédito fiscal IVA (es DÉBITO, no crédito) ─────────
      // El IVA de una factura de compra genera un crédito fiscal a favor
      if (montoIVA > 0 && d.U_CuentaIVA) {
        lines.push({
          ...base,
          AccountCode: d.U_CuentaIVA,
          Debit:       montoIVA,
          Credit:      0,
          U_IMPORTE:   montoIVA,
        });
        totalDebitoNeto += montoIVA;
      }

      // ── CRÉDITO 1: retención IT ───────────────────────────────────────
      if (montoIT > 0 && d.U_CuentaIT) {
        lines.push({
          ...base,
          AccountCode: d.U_CuentaIT,
          Debit:       0,
          Credit:      montoIT,
          U_IMPORTE:   montoIT,
        });
        totalDebitoNeto -= montoIT;
      }

      // ── CRÉDITO 2: retención RCIVA ────────────────────────────────────
      if (montoRCIVA > 0 && d.U_CuentaRCIVA) {
        lines.push({
          ...base,
          AccountCode: d.U_CuentaRCIVA,
          Debit:       0,
          Credit:      montoRCIVA,
          U_IMPORTE:   montoRCIVA,
        });
        totalDebitoNeto -= montoRCIVA;
      }

      // ── CRÉDITO 3: retención IUE ──────────────────────────────────────
      if (montoIUE > 0 && d.U_CuentaIUE) {
        lines.push({
          ...base,
          AccountCode: d.U_CuentaIUE,
          Debit:       0,
          Credit:      montoIUE,
          U_IMPORTE:   montoIUE,
        });
        totalDebitoNeto -= montoIUE;
      }

      // Nota: U_RD_Exento es un campo INFORMATIVO que va en U_EXENTO de la línea
      // principal — NO genera una línea contable separada. Ya está incluido en
      // U_RD_Importe (el importe bruto del documento ya contempla el exento).
    }

    // ── LÍNEA FINAL: contrapartida en cuenta cabecera ─────────────────────
    // Cuenta ASOCIADA a empleado → ShortName = U_Empleado (código empleado SAP)
    //   AccountCode debe OMITIRSE — SAP rechaza AccountCode vacío junto a ShortName
    // Cuenta NO ASOCIADA → AccountCode = U_Cuenta (código contable directo)
    const lineaFinalBase = {
      Debit:        0,
      Credit:       Math.abs(totalDebitoNeto),
      U_CARDNAME:   rend.U_NombreEmpleado?.trim() || rend.U_NomUsuario || '',
      U_FECHAFAC:   fechaCabecera,
      U_NUM_FACT:   0,
      U_NUMORDEN:   0,
      U_NUMPOL:     '0',
      U_EXENTO:     0,
      U_ICE:        0,
      U_IMPORTE:    Math.abs(totalDebitoNeto),
      U_TIPODOC:    10,
      U_DESCTOBR:   0,
      U_BOLBSP:     0,
      U_CODFORPI:   '0',
      U_NROTRAM:    '0',
      U_TASACERO:   0,
      U_ESTADOFC:   'V',
      U_NumDoc:     0,
      U_NumAuto:    '0',
      U_NIT:        '',
      U_IEHD:       0,
      U_IPJ:        0,
      U_TASAS:      0,
      U_OP_EXENTO:  0,
      U_B_cuf:      '0',
    };

    const lineaFinal: any = rend.U_Empleado?.trim()
      // Cuenta asociada: solo ShortName, sin AccountCode
      ? { ...lineaFinalBase, ShortName: rend.U_Empleado.trim() }
      // Cuenta no asociada: solo AccountCode, sin ShortName
      : { ...lineaFinalBase, AccountCode: rend.U_Cuenta };

    lines.push(lineaFinal);

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

    const absEntry = body?.AbsEntry ?? body?.value ?? body?.JournalVoucher?.AbsEntry;
    const nroDoc   = absEntry ? String(absEntry) : 'OK';
    this.logger.log(`SAP SL Asiento creado — AbsEntry: ${nroDoc}`);
    return nroDoc;
  }

  // ── Helper privado ────────────────────────────────────────────────────────

  private buildBaseFields(
    d:    RendD,
    rend: RendM,
  ): Omit<JournalLine, 'AccountCode' | 'ShortName' | 'Debit' | 'Credit' | 'U_IMPORTE'> {

    // Fecha del documento individual; si no existe usar la fecha final de la rendición
    const fecha = d.U_RD_Fecha?.substring(0, 10)
               ?? rend.U_FechaFinal?.substring(0, 10)
               ?? new Date().toISOString().substring(0, 10);

    // U_CARDNAME: nombre del proveedor si existe, sino nombre del empleado o usuario
    const cardName = d.U_RD_Prov?.trim()
                  || rend.U_NombreEmpleado?.trim()
                  || rend.U_NomUsuario
                  || '';

    // U_NUM_FACT y U_NumDoc: número de factura/documento (U_RD_NumDocumento)
    const numDoc = Number(d.U_RD_NumDocumento ?? 0) || 0;

    // U_BOLBSP: número de boleto/recibo
    const bolBsp = numDoc;

    // U_NumAuto: SAP B1 tiene validaciones cruzadas según U_TIPODOC:
    //   - TIPODOC 4 (Recibo de Alquiler) → debe ser '2' (código fijo SAP)
    //   - TIPODOC 1 (Compra/Factura)     → número de autorización real, o '0' si no tiene
    //   - Resto (recibos, sin asignar...) → '0' (SAP rechaza 'N/A' o vacío)
    const tipoDoc = d.U_RD_IdTipoDoc > 0 ? d.U_RD_IdTipoDoc : 10;
    let numAuto: string;
    if (tipoDoc === 4) {
      numAuto = '2';
    } else if (d.U_RD_NroAutor?.trim()) {
      numAuto = d.U_RD_NroAutor.trim();
    } else {
      numAuto = '0';
    }

    // U_B_cuf: CUF de la factura electrónica (solo facturas, '0' para recibos)
    const cuf = d.U_CUF?.trim() || '0';

    // U_NIT: NIT del proveedor/cliente
    const nit = d.U_RD_NIT?.trim() || '';

    return {
      U_CARDNAME:  cardName,
      U_FECHAFAC:  fecha,
      U_NUM_FACT:  numDoc,
      U_NUMORDEN:  0,
      U_NUMPOL:    '0',
      U_EXENTO:    0,        // default 0 — la línea principal lo sobreescribe con el valor real
      U_ICE:       d.U_ICE         ?? 0,
      // U_TIPODOC: SAP acepta valores 1-10. 0 no es válido → usar 10 (SIN ASIGNAR)
      U_TIPODOC:   tipoDoc,
      U_DESCTOBR:  d.U_RD_Descuento ?? 0,
      U_BOLBSP:    bolBsp,
      U_CODFORPI:  '0',
      U_NROTRAM:   '0',
      U_TASACERO:  d.U_RD_TasaCero  ?? 0,
      U_ESTADOFC:  'V',
      U_NumDoc:    numDoc,
      U_NumAuto:   numAuto,
      U_NIT:       nit,
      U_IEHD:      0,
      U_IPJ:       0,
      U_TASAS:     0,
      U_OP_EXENTO: 0,
      U_B_cuf:     cuf,
    };
  }
}