import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IRendDRepository } from './rend-d.repository.interface';
import { RendD } from '../interfaces/rend-d.interface';
import { CreateRendDDto } from '../dto/create-rend-d.dto';
import { UpdateRendDDto } from '../dto/update-rend-d.dto';
import { getTableMutex } from '../../../common/utils/db-mutex';

// Columnas de REND_D con prefijo d. para queries con JOIN
const SAFE_COLS = `
  d."U_RD_IdRD", d."U_RD_RM_IdRendicion", d."U_RD_IdUsuario",
  d."U_RD_Cuenta", d."U_RD_NombreCuenta", d."U_RD_Concepto",
  d."U_RD_Importe", d."U_RD_Descuento", d."U_RD_TasaCero",
  d."U_RD_N1", d."U_RD_N2", d."U_RD_N3", d."U_RD_N4", d."U_RD_N5",
  d."U_RD_Proyecto", d."U_RD_Fecha",
  d."U_RD_IdTipoDoc", d."U_RD_IdDoc", d."U_RD_TipoDoc",
  d."U_RD_Partida", d."U_RD_Exento", d."U_RD_Estado",
  d."U_RD_ImpRet", d."U_RD_Total",
  d."U_RD_NumDocumento", d."U_RD_NroAutor", d."U_RD_Ctrl",
  d."U_RD_NIT", d."U_RD_CodProv", d."U_RD_Prov",
  d."U_MontoIVA", d."U_MontoIT", d."U_MontoIUE", d."U_MontoRCIVA",
  d."U_ImporteBs", d."U_EXENTOBS", d."U_DESCTOBS",
  d."U_RD_Marcado", d."U_CTAEXENTO",
  d."U_RD_AUXILIAR1", d."U_RD_AUXILIAR2", d."U_RD_AUXILIAR3", d."U_RD_AUXILIAR4",
  d."U_TASA", d."U_CUF", d."U_GIFTCARD", d."U_ICE", d."U_RD_NRO_OT",
  -- Cuentas: valor propio si existe, sino fallback desde REND_CTA (join por U_RD_IdDoc)
  COALESCE(NULLIF(d."U_CuentaIVA",   ''), c."U_IVAcuenta")   AS "U_CuentaIVA",
  COALESCE(NULLIF(d."U_CuentaIT",    ''), c."U_ITcuenta")    AS "U_CuentaIT",
  COALESCE(NULLIF(d."U_CuentaIUE",   ''), c."U_IUEcuenta")   AS "U_CuentaIUE",
  COALESCE(NULLIF(d."U_CuentaRCIVA", ''), c."U_RCIVAcuenta") AS "U_CuentaRCIVA"
`;

// Para queries SIN JOIN (create/update/findAll simple) — sin prefijo d.
const SAFE_COLS_SIMPLE = `
  "U_RD_IdRD", "U_RD_RM_IdRendicion", "U_RD_IdUsuario",
  "U_RD_Cuenta", "U_RD_NombreCuenta", "U_RD_Concepto",
  "U_RD_Importe", "U_RD_Descuento", "U_RD_TasaCero",
  "U_RD_N1", "U_RD_N2", "U_RD_N3", "U_RD_N4", "U_RD_N5",
  "U_RD_Proyecto", "U_RD_Fecha",
  "U_RD_IdTipoDoc", "U_RD_IdDoc", "U_RD_TipoDoc",
  "U_RD_Partida", "U_RD_Exento", "U_RD_Estado",
  "U_RD_ImpRet", "U_RD_Total",
  "U_RD_NumDocumento", "U_RD_NroAutor", "U_RD_Ctrl",
  "U_RD_NIT", "U_RD_CodProv", "U_RD_Prov",
  "U_MontoIVA", "U_MontoIT", "U_MontoIUE", "U_MontoRCIVA",
  "U_CuentaIVA", "U_CuentaIT", "U_CuentaIUE", "U_CuentaRCIVA",
  "U_ImporteBs", "U_EXENTOBS", "U_DESCTOBS",
  "U_RD_Marcado", "U_CTAEXENTO",
  "U_RD_AUXILIAR1", "U_RD_AUXILIAR2", "U_RD_AUXILIAR3", "U_RD_AUXILIAR4",
  "U_TASA", "U_CUF", "U_GIFTCARD", "U_ICE", "U_RD_NRO_OT"
`;

@Injectable()
export class RendDHanaRepository implements IRendDRepository {
  private readonly logger = new Logger(RendDHanaRepository.name);

  private get schema(): string  { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string  { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get DB(): string      { return tbl(this.schema, 'REND_D',   this.dbType); }
  private get DB_CTA(): string  { return tbl(this.schema, 'REND_CTA', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  // ── Normalización ─────────────────────────────────────────────
  // Postgres devuelve DECIMAL/NUMERIC como strings.
  // Convertimos todos los campos numéricos a number para que el frontend
  // pueda usar pipes como number:'1.2-2' y comparaciones sin problemas.

  private _num(row: any, col: string, fallback = 0): number {
    const v = this.db.col(row, col);
    if (v === null || v === undefined || v === '') return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  }

  private _numNull(row: any, col: string): number | null {
    const v = this.db.col(row, col);
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  private _str(row: any, col: string, fallback = ''): string {
    const v = this.db.col(row, col);
    if (v === null || v === undefined) return fallback;
    // Postgres devuelve fechas como objetos Date — convertir a YYYY-MM-DD
    if (v instanceof Date) return v.toISOString().substring(0, 10);
    return String(v);
  }

  private normalize(row: any): RendD {
    return {
      U_RD_IdRD:           this._num(row, 'U_RD_IdRD'),
      U_RD_RM_IdRendicion: this._num(row, 'U_RD_RM_IdRendicion'),
      U_RD_IdUsuario:      this._num(row, 'U_RD_IdUsuario'),
      U_RD_Cuenta:         this._str(row, 'U_RD_Cuenta',       null as any) || null,
      U_RD_NombreCuenta:   this._str(row, 'U_RD_NombreCuenta', null as any) || null,
      U_RD_Concepto:       this._str(row, 'U_RD_Concepto'),
      U_RD_Importe:        this._num(row, 'U_RD_Importe'),
      U_RD_Descuento:      this._num(row, 'U_RD_Descuento'),
      U_RD_TasaCero:       this._numNull(row, 'U_RD_TasaCero'),
      U_RD_N1:             this._str(row, 'U_RD_N1', null as any) || null,
      U_RD_N2:             this._str(row, 'U_RD_N2', null as any) || null,
      U_RD_N3:             this._str(row, 'U_RD_N3', null as any) || null,
      U_RD_N4:             this._str(row, 'U_RD_N4', null as any) || null,
      U_RD_N5:             this._str(row, 'U_RD_N5', null as any) || null,
      U_RD_Proyecto:       this._str(row, 'U_RD_Proyecto', null as any) || null,
      U_RD_Fecha:          this._str(row, 'U_RD_Fecha'),
      U_RD_IdTipoDoc:      this._num(row, 'U_RD_IdTipoDoc'),
      U_RD_IdDoc:          this._numNull(row, 'U_RD_IdDoc'),
      U_RD_TipoDoc:        this._str(row, 'U_RD_TipoDoc'),
      U_RD_Partida:        this._str(row, 'U_RD_Partida', null as any) || null,
      U_RD_Exento:         this._numNull(row, 'U_RD_Exento'),
      U_RD_Estado:         this._num(row, 'U_RD_Estado'),
      U_RD_ImpRet:         this._numNull(row, 'U_RD_ImpRet'),
      U_RD_Total:          this._numNull(row, 'U_RD_Total'),
      U_RD_NumDocumento:   this._str(row, 'U_RD_NumDocumento', null as any) || null,
      U_RD_NroAutor:       this._str(row, 'U_RD_NroAutor',    null as any) || null,
      U_RD_Ctrl:           this._str(row, 'U_RD_Ctrl',        null as any) || null,
      U_RD_NIT:            this._str(row, 'U_RD_NIT'),
      U_RD_CodProv:        this._str(row, 'U_RD_CodProv',     null as any) || null,
      U_RD_Prov:           this._str(row, 'U_RD_Prov',        null as any) || null,
      U_MontoIVA:          this._num(row, 'U_MontoIVA'),
      U_MontoIT:           this._num(row, 'U_MontoIT'),
      U_MontoIUE:          this._num(row, 'U_MontoIUE'),
      U_MontoRCIVA:        this._num(row, 'U_MontoRCIVA'),
      U_CuentaIVA:         this._str(row, 'U_CuentaIVA',      null as any) || null,
      U_CuentaIT:          this._str(row, 'U_CuentaIT',       null as any) || null,
      U_CuentaIUE:         this._str(row, 'U_CuentaIUE',      null as any) || null,
      U_CuentaRCIVA:       this._str(row, 'U_CuentaRCIVA',    null as any) || null,
      U_ImporteBs:         this._numNull(row, 'U_ImporteBs'),
      U_EXENTOBS:          this._numNull(row, 'U_EXENTOBS'),
      U_DESCTOBS:          this._numNull(row, 'U_DESCTOBS'),
      U_RD_Marcado:        this._num(row, 'U_RD_Marcado'),
      U_CTAEXENTO:         this._str(row, 'U_CTAEXENTO'),
      U_RD_AUXILIAR1:      this._str(row, 'U_RD_AUXILIAR1'),
      U_RD_AUXILIAR2:      this._str(row, 'U_RD_AUXILIAR2'),
      U_RD_AUXILIAR3:      this._str(row, 'U_RD_AUXILIAR3'),
      U_RD_AUXILIAR4:      this._str(row, 'U_RD_AUXILIAR4'),
      U_TASA:              this._numNull(row, 'U_TASA'),
      U_CUF:               this._str(row, 'U_CUF',            null as any) || null,
      U_GIFTCARD:          this._numNull(row, 'U_GIFTCARD'),
      U_ICE:               this._num(row, 'U_ICE'),
      U_RD_NRO_OT:         this._str(row, 'U_RD_NRO_OT'),
    };
  }

  // ── Consultas ─────────────────────────────────────────────────

  async findByRendicion(idRendicion: number, idUsuario: number): Promise<RendD[]> {
    const rows = await this.db.query<any>(
      // LEFT JOIN REND_CTA para completar cuentas de impuesto vacías en REND_D.
      // Las cuentas vienen del SAFE_COLS con COALESCE(d.cuenta, c.cuenta).
      `SELECT ${SAFE_COLS}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_CTA} c ON c."U_IdDocumento" = d."U_RD_IdDoc"
       WHERE d."U_RD_RM_IdRendicion" = ? AND d."U_RD_IdUsuario" = ?
       ORDER BY d."U_RD_IdRD"`,
      [idRendicion, idUsuario],
    );
    return rows.map(r => this.normalize(r));
  }

  async findOne(idRendicion: number, idRD: number, idUsuario: number): Promise<RendD | null> {
    const rows = await this.db.query<any>(
      `SELECT ${SAFE_COLS}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_CTA} c ON c."U_IdDocumento" = d."U_RD_IdDoc"
       WHERE d."U_RD_RM_IdRendicion" = ? AND d."U_RD_IdRD" = ? AND d."U_RD_IdUsuario" = ?`,
      [idRendicion, idRD, idUsuario],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  // ── Mutaciones ────────────────────────────────────────────────

  async create(idRendicion: number, idUsuario: number, dto: CreateRendDDto): Promise<RendD | null> {
    const mutex = getTableMutex('REND_D');

    return mutex.runExclusive(async () => {
      const idRows = await this.db.query<Record<string, number>>(
        `SELECT COALESCE(MAX("U_RD_IdRD"), 0) + 1 AS "newId"
        FROM ${this.DB}
        WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdUsuario" = ?`,
        [idRendicion, idUsuario],
      );
      const newId = Number(this.db.col(idRows[0], 'newId')) || 1;

      await this.db.execute(
        `INSERT INTO ${this.DB} (
            "U_RD_IdRD",
            "U_RD_RM_IdRendicion", "U_RD_IdUsuario",
            "U_RD_Cuenta", "U_RD_NombreCuenta", "U_RD_Concepto",
            "U_RD_Importe", "U_RD_Descuento", "U_RD_TasaCero",
            "U_RD_N1", "U_RD_N2", "U_RD_N3", "U_RD_N4", "U_RD_N5",
            "U_RD_Proyecto", "U_RD_Fecha",
            "U_RD_IdTipoDoc", "U_RD_IdDoc", "U_RD_TipoDoc",
            "U_RD_Partida", "U_RD_Exento", "U_RD_Estado",
            "U_RD_ImpRet", "U_RD_Total",
            "U_RD_NumDocumento", "U_RD_NroAutor", "U_RD_Ctrl",
            "U_RD_NIT", "U_RD_CodProv", "U_RD_Prov",
            "U_MontoIVA", "U_MontoIT", "U_MontoIUE", "U_MontoRCIVA",
            "U_CuentaIVA", "U_CuentaIT", "U_CuentaIUE", "U_CuentaRCIVA",
            "U_ImporteBs", "U_EXENTOBS", "U_DESCTOBS",
            "U_RD_Marcado", "U_CTAEXENTO",
            "U_RD_AUXILIAR1", "U_RD_AUXILIAR2", "U_RD_AUXILIAR3", "U_RD_AUXILIAR4",
            "U_TASA", "U_CUF", "U_GIFTCARD", "U_ICE", "U_RD_NRO_OT"
          )
          VALUES (
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?
          )`,
        [
          newId,
          idRendicion, idUsuario,
          dto.cuenta        ?? null, dto.nombreCuenta  ?? null, dto.concepto,
          dto.importe, dto.descuento ?? 0, dto.tasaCero ?? null,
          dto.n1 ?? null, dto.n2 ?? null, dto.n3 ?? null, dto.n4 ?? null, dto.n5 ?? null,
          dto.proyecto ?? null, dto.fecha,
          dto.idTipoDoc, dto.idDoc ?? null, dto.tipoDoc ?? '',
          dto.partida ?? null, dto.exento ?? null, 1,
          dto.impRet ?? null, dto.total ?? null,
          dto.numDocumento ?? null, dto.nroAutor ?? null, dto.ctrl ?? null,
          dto.nit ?? '', dto.codProv ?? null, dto.prov ?? null,
          // NOT NULL DECIMAL — enviar 0 en lugar de null
          dto.montoIVA  ?? 0, dto.montoIT  ?? 0, dto.montoIUE  ?? 0, dto.montoRCIVA ?? 0,
          // cuentas de impuesto — TRUE (nullable)
          dto.cuentaIVA ?? null, dto.cuentaIT ?? null, dto.cuentaIUE ?? null, dto.cuentaRCIVA ?? null,
          // ImporteBs/ExentoBs/DesctoBs — TRUE (nullable)
          dto.importeBs ?? null, dto.exentoBs ?? null, dto.desctoBs ?? null,
          // U_RD_Marcado NOT NULL TINYINT DEFAULT 0 — enviar 0 (número, no string)
          0,
          // U_CTAEXENTO NOT NULL — enviar string vacío en lugar de null
          dto.ctaExento ?? '',
          // U_RD_AUXILIAR1-4 NOT NULL — enviar string vacío en lugar de null
          dto.auxiliar1 ?? '', dto.auxiliar2 ?? '', dto.auxiliar3 ?? '', dto.auxiliar4 ?? '',
          // U_TASA TRUE (nullable), U_CUF TRUE (nullable), U_GIFTCARD TRUE DEFAULT 0
          dto.tasa ?? null, dto.cuf ?? null, dto.giftCard ?? 0,
          // U_ICE NOT NULL DEFAULT 0, U_RD_NRO_OT NOT NULL
          dto.ice ?? 0, dto.nroOT ?? '',
        ],
      );

      this.logger.log(`REND_D creado: ID ${newId} — rendición ${idRendicion} — usuario ${idUsuario}`);
      return this.findOne(idRendicion, newId, idUsuario);
    });
  }

  async update(idRendicion: number, idRD: number, idUsuario: number, dto: UpdateRendDDto): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    const add = (col: string, val: any) => {
      if (val !== undefined) { setParts.push(`"${col}" = ?`); params.push(val); }
    };

    add('U_RD_Cuenta',       dto.cuenta);
    add('U_RD_NombreCuenta', dto.nombreCuenta);
    add('U_RD_Concepto',     dto.concepto);
    add('U_RD_Fecha',        dto.fecha);
    add('U_RD_IdTipoDoc',    dto.idTipoDoc);
    add('U_RD_TipoDoc',      dto.tipoDoc);
    add('U_RD_IdDoc',        dto.idDoc);
    add('U_RD_NumDocumento', dto.numDocumento);
    add('U_RD_NroAutor',     dto.nroAutor);
    add('U_RD_Ctrl',         dto.ctrl);
    add('U_CUF',             dto.cuf);
    add('U_RD_Importe',      dto.importe);
    add('U_RD_Descuento',    dto.descuento);
    add('U_RD_TasaCero',     dto.tasaCero);
    add('U_RD_Exento',       dto.exento);
    add('U_RD_ImpRet',       dto.impRet);
    add('U_RD_Total',        dto.total);
    add('U_ImporteBs',       dto.importeBs);
    add('U_EXENTOBS',        dto.exentoBs);
    add('U_DESCTOBS',        dto.desctoBs);
    add('U_TASA',            dto.tasa);
    add('U_GIFTCARD',        dto.giftCard);
    add('U_MontoIVA',        dto.montoIVA);
    add('U_MontoIT',         dto.montoIT);
    add('U_MontoIUE',        dto.montoIUE);
    add('U_MontoRCIVA',      dto.montoRCIVA);
    add('U_ICE',             dto.ice);
    add('U_CuentaIVA',       dto.cuentaIVA);
    add('U_CuentaIT',        dto.cuentaIT);
    add('U_CuentaIUE',       dto.cuentaIUE);
    add('U_CuentaRCIVA',     dto.cuentaRCIVA);
    add('U_CTAEXENTO',       dto.ctaExento);
    add('U_RD_NIT',          dto.nit);
    add('U_RD_CodProv',      dto.codProv);
    add('U_RD_Prov',         dto.prov);
    add('U_RD_N1',           dto.n1);
    add('U_RD_N2',           dto.n2);
    add('U_RD_N3',           dto.n3);
    add('U_RD_N4',           dto.n4);
    add('U_RD_N5',           dto.n5);
    add('U_RD_Proyecto',     dto.proyecto);
    add('U_RD_Partida',      dto.partida);
    add('U_RD_NRO_OT',       dto.nroOT);
    add('U_RD_AUXILIAR1',    dto.auxiliar1);
    add('U_RD_AUXILIAR2',    dto.auxiliar2);
    add('U_RD_AUXILIAR3',    dto.auxiliar3);
    add('U_RD_AUXILIAR4',    dto.auxiliar4);

    if (!setParts.length) return { affected: 0 };

    const affected = await this.db.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdRD" = ? AND "U_RD_IdUsuario" = ?`,
      [...params, idRendicion, idRD, idUsuario],
    );
    return { affected };
  }

  async remove(idRendicion: number, idRD: number, idUsuario: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdRD" = ? AND "U_RD_IdUsuario" = ?`,
      [idRendicion, idRD, idUsuario],
    );
    return { affected };
  }
}