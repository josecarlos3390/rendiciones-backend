import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IRendDRepository } from './rend-d.repository.interface';
import { RendD } from '../interfaces/rend-d.interface';
import { CreateRendDDto } from '../dto/create-rend-d.dto';
import { UpdateRendDDto } from '../dto/update-rend-d.dto';

const SAFE_COLS = `
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
  private get DB(): string      { return tbl(this.schema, 'REND_D', this.dbType); }

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
    return v !== null && v !== undefined ? String(v) : fallback;
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

  async findByRendicion(idRendicion: number): Promise<RendD[]> {
    const rows = await this.db.query<any>(
      `SELECT ${SAFE_COLS} FROM ${this.DB}
       WHERE "U_RD_RM_IdRendicion" = ?
       ORDER BY "U_RD_IdRD"`,
      [idRendicion],
    );
    return rows.map(r => this.normalize(r));
  }

  async findOne(idRendicion: number, idRD: number): Promise<RendD | null> {
    const rows = await this.db.query<any>(
      `SELECT ${SAFE_COLS} FROM ${this.DB}
       WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdRD" = ?`,
      [idRendicion, idRD],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  // ── Mutaciones ────────────────────────────────────────────────

  async create(idRendicion: number, idUsuario: number, dto: CreateRendDDto): Promise<RendD | null> {
    // Número de línea correlativo dentro de la rendición — 1, 2, 3...
    // Usamos COUNT en lugar de MAX para que rendiciones existentes con IDs
    // altos (del sequence anterior) también obtengan numeración correlativa.
    // Ej: rendición con docs 193,194 → próximo newId = COUNT(2) + 1 = 3
    const idRows = await this.db.query<Record<string, number>>(
      `SELECT COUNT(*) + 1 AS "newId"
       FROM ${this.DB}
       WHERE "U_RD_RM_IdRendicion" = ?`,
      [idRendicion],
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
        ) VALUES (
          ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, 0,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          0, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )`,
      [
        newId,
        idRendicion,        idUsuario,
        dto.cuenta          ?? null,  dto.nombreCuenta  ?? null,  dto.concepto,
        dto.importe,        dto.descuento,                        dto.tasaCero    ?? 0,
        dto.n1              ?? '',    dto.n2            ?? '',    dto.n3          ?? '',
        dto.n4              ?? '',    dto.n5            ?? '',
        dto.proyecto        ?? null,  dto.fecha,
        dto.idTipoDoc,      dto.idDoc ?? null,                    dto.tipoDoc,
        dto.partida         ?? null,  dto.exento        ?? 0,
        dto.impRet          ?? 0,     dto.total         ?? null,
        dto.numDocumento    ?? null,  dto.nroAutor      ?? null,  dto.ctrl        ?? null,
        dto.nit,            dto.codProv ?? null,                  dto.prov        ?? null,
        dto.montoIVA,       dto.montoIT,       dto.montoIUE,      dto.montoRCIVA,
        dto.cuentaIVA       ?? null,  dto.cuentaIT      ?? null,
        dto.cuentaIUE       ?? null,  dto.cuentaRCIVA   ?? null,
        dto.importeBs       ?? null,  dto.exentoBs      ?? null,  dto.desctoBs    ?? null,
        dto.ctaExento       ?? '',
        dto.auxiliar1       ?? '',    dto.auxiliar2     ?? '',
        dto.auxiliar3       ?? '',    dto.auxiliar4     ?? '',
        dto.tasa            ?? null,  dto.cuf           ?? null,
        dto.giftCard        ?? null,  dto.ice,          dto.nroOT ?? '',
      ],
    );

    this.logger.log(`REND_D creado: ID ${newId} — rendición ${idRendicion}`);
    return this.findOne(idRendicion, newId);
  }

  async update(idRendicion: number, idRD: number, dto: UpdateRendDDto): Promise<{ affected: number }> {
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
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdRD" = ?`,
      [...params, idRendicion, idRD],
    );
    return { affected };
  }

  async remove(idRendicion: number, idRD: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_RD_RM_IdRendicion" = ? AND "U_RD_IdRD" = ?`,
      [idRendicion, idRD],
    );
    return { affected };
  }
}