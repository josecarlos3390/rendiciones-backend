import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { IDocumentosRepository } from './documentos.repository.interface';
import { Documento } from '../interfaces/documento.interface';
import { CreateDocumentoDto } from '../dto/create-documento.dto';
import { UpdateDocumentoDto } from '../dto/update-documento.dto';

@Injectable()
export class DocumentosHanaRepository implements IDocumentosRepository {
  private readonly logger = new Logger(DocumentosHanaRepository.name);

  private get schema(): string  { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string  { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get DB(): string      { return tbl(this.schema, 'REND_CTA',    this.dbType); }
  private get DB_PERF(): string { return tbl(this.schema, 'REND_PERFIL', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private readonly SELECT = `
    d."U_IdDocumento", d."U_CodPerfil", d."U_TipDoc", d."U_EXENTOpercent",
    d."U_IdTipoDoc", d."U_TipoCalc",
    d."U_IVApercent", d."U_IVAcuenta",
    d."U_ITpercent",  d."U_ITcuenta",
    d."U_IUEpercent", d."U_IUEcuenta",
    d."U_RCIVApercent", d."U_RCIVAcuenta",
    d."U_CTAEXENTO", d."U_TASA", d."U_ICE",
    p."U_NombrePerfil"`;

  /**
   * Postgres devuelve columnas DECIMAL/NUMERIC como strings.
   * Este método normaliza todos los campos numéricos a number
   * para que las comparaciones del frontend (=== -1, > 0, etc.) funcionen
   * independientemente del motor de base de datos.
   */
  private normalize(row: any): Documento {
    return {
      ...row,
      U_IdDocumento:   Number(this.db.col(row, 'U_IdDocumento')),
      U_CodPerfil:     Number(this.db.col(row, 'U_CodPerfil')),
      U_IdTipoDoc:     Number(this.db.col(row, 'U_IdTipoDoc')),
      U_EXENTOpercent: Number(this.db.col(row, 'U_EXENTOpercent')),
      U_IVApercent:    this._toNumberOrNull(this.db.col(row, 'U_IVApercent')),
      U_ITpercent:     this._toNumberOrNull(this.db.col(row, 'U_ITpercent')),
      U_IUEpercent:    this._toNumberOrNull(this.db.col(row, 'U_IUEpercent')),
      U_RCIVApercent:  this._toNumberOrNull(this.db.col(row, 'U_RCIVApercent')),
      U_TASA:          this._toNumberOrNull(this.db.col(row, 'U_TASA')),
      U_ICE:           Number(this.db.col(row, 'U_ICE') ?? 0),
      U_TipoCalc:      String(this.db.col(row, 'U_TipoCalc') ?? '0'),
      U_TipDoc:        this.db.col(row, 'U_TipDoc')        ?? '',
      U_IVAcuenta:     this.db.col(row, 'U_IVAcuenta')     ?? '',
      U_ITcuenta:      this.db.col(row, 'U_ITcuenta')      ?? '',
      U_IUEcuenta:     this.db.col(row, 'U_IUEcuenta')     ?? '',
      U_RCIVAcuenta:   this.db.col(row, 'U_RCIVAcuenta')   ?? '',
      U_CTAEXENTO:     this.db.col(row, 'U_CTAEXENTO')     ?? '',
      U_NombrePerfil:  this.db.col(row, 'U_NombrePerfil')  ?? '',
    };
  }

  private _toNumberOrNull(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  // ── Consultas ─────────────────────────────────────────────────

  async findAll(): Promise<Documento[]> {
    const rows = await this.db.query<any>(
      `SELECT ${this.SELECT}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = d."U_CodPerfil"
       ORDER BY d."U_CodPerfil", d."U_TipDoc"`,
    );
    return rows.map(r => this.normalize(r));
  }

  async findByPerfil(codPerfil: number): Promise<Documento[]> {
    const rows = await this.db.query<any>(
      `SELECT ${this.SELECT}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = d."U_CodPerfil"
       WHERE d."U_CodPerfil" = ?
       ORDER BY d."U_TipDoc"`,
      [codPerfil],
    );
    return rows.map(r => this.normalize(r));
  }

  async findOne(id: number): Promise<Documento | null> {
    const rows = await this.db.query<any>(
      `SELECT ${this.SELECT}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = d."U_CodPerfil"
       WHERE d."U_IdDocumento" = ?`,
      [id],
    );
    return rows[0] ? this.normalize(rows[0]) : null;
  }

  // ── Mutaciones ────────────────────────────────────────────────

  async create(dto: CreateDocumentoDto): Promise<Documento> {
    const seqRows = await this.db.query<any>(
      `SELECT COALESCE(MAX("U_IdDocumento"), 0) + 1 AS NEXT_ID FROM ${this.DB}`,
    );
    const nextId = Number(this.db.col(seqRows[0], 'NEXT_ID')) || 1;

    await this.db.execute(
      `INSERT INTO ${this.DB} (
        "U_IdDocumento", "U_CodPerfil", "U_TipDoc", "U_EXENTOpercent",
        "U_IdTipoDoc", "U_TipoCalc",
        "U_IVApercent", "U_IVAcuenta",
        "U_ITpercent",  "U_ITcuenta",
        "U_IUEpercent", "U_IUEcuenta",
        "U_RCIVApercent", "U_RCIVAcuenta",
        "U_CTAEXENTO", "U_TASA", "U_ICE"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nextId,
        dto.codPerfil,
        dto.tipDoc,
        dto.exentoPercent ?? 0,
        dto.idTipoDoc,
        Number(dto.tipoCalc),
        dto.ivaPercent    ?? 0,    dto.ivaCuenta   ?? '',
        dto.itPercent     ?? 0,    dto.itCuenta    ?? '',
        dto.iuePercent    ?? 0,    dto.iueCuenta   ?? '',
        dto.rcivaPercent  ?? 0,    dto.rcivaCuenta ?? '',
        dto.ctaExento     ?? '',
        dto.tasa ?? 0,
        dto.ice  ?? 0,
      ],
    );
    return this.findOne(nextId);
  }

  async update(id: number, dto: UpdateDocumentoDto): Promise<Documento> {
    const sets: string[] = [];
    const params: any[]  = [];

    const addField = (col: string, val: any) => {
      if (val !== undefined) { sets.push(`"${col}" = ?`); params.push(val); }
    };

    addField('U_CodPerfil',    dto.codPerfil);
    addField('U_TipDoc',       dto.tipDoc);
    addField('U_IdTipoDoc',    dto.idTipoDoc);
    addField('U_TipoCalc',     dto.tipoCalc !== undefined ? Number(dto.tipoCalc) : undefined);
    addField('U_IVApercent',   dto.ivaPercent);
    addField('U_IVAcuenta',    dto.ivaCuenta);
    addField('U_ITpercent',    dto.itPercent);
    addField('U_ITcuenta',     dto.itCuenta);
    addField('U_IUEpercent',   dto.iuePercent);
    addField('U_IUEcuenta',    dto.iueCuenta);
    addField('U_RCIVApercent', dto.rcivaPercent);
    addField('U_RCIVAcuenta',  dto.rcivaCuenta);
    addField('U_EXENTOpercent',dto.exentoPercent);
    addField('U_CTAEXENTO',    dto.ctaExento);
    addField('U_TASA',         dto.tasa);
    addField('U_ICE',          dto.ice);

    if (sets.length > 0) {
      params.push(id);
      await this.db.execute(
        `UPDATE ${this.DB} SET ${sets.join(', ')} WHERE "U_IdDocumento" = ?`,
        params,
      );
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdDocumento" = ?`,
      [id],
    );
    return { affected };
  }
}