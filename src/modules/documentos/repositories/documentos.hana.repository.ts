import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { IDocumentosRepository } from './documentos.repository.interface';
import { Documento } from '../interfaces/documento.interface';
import { CreateDocumentoDto } from '../dto/create-documento.dto';
import { UpdateDocumentoDto } from '../dto/update-documento.dto';
import { tbl } from '../../../database/db-table.helper';

@Injectable()
export class DocumentosHanaRepository implements IDocumentosRepository {
  private readonly logger = new Logger(DocumentosHanaRepository.name);

  private get dbType(): string  { return this.configService.get<string>('app.dbType', 'HANA').toUpperCase(); }
  private get schema(): string  { return this.configService.get<string>('hana.schema'); }
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

  private norm(row: any): Documento {
    const c = (n: string) => this.db.col(row, n);
    return {
      U_IdDocumento:   Number(c('U_IdDocumento')),
      U_CodPerfil:     Number(c('U_CodPerfil')),
      U_TipDoc:        c('U_TipDoc')        ?? '',
      U_EXENTOpercent: Number(c('U_EXENTOpercent')) || 0,
      U_IdTipoDoc:     Number(c('U_IdTipoDoc'))     || 0,
      U_TipoCalc:      c('U_TipoCalc')      ?? '0',
      U_IVApercent:    Number(c('U_IVApercent'))    || 0,
      U_IVAcuenta:     c('U_IVAcuenta')     ?? '',
      U_ITpercent:     Number(c('U_ITpercent'))     || 0,
      U_ITcuenta:      c('U_ITcuenta')      ?? '',
      U_IUEpercent:    Number(c('U_IUEpercent'))    || 0,
      U_IUEcuenta:     c('U_IUEcuenta')     ?? '',
      U_RCIVApercent:  Number(c('U_RCIVApercent'))  || 0,
      U_RCIVAcuenta:   c('U_RCIVAcuenta')   ?? '',
      U_CTAEXENTO:     c('U_CTAEXENTO')     ?? '',
      U_TASA:          Number(c('U_TASA'))          || 0,
      U_ICE:           Number(c('U_ICE'))           || 0,
      U_NombrePerfil:  c('U_NombrePerfil')  ?? undefined,
    };
  }

  async findAll(): Promise<Documento[]> {
    const rows = await this.db.query<any>(
      `SELECT ${this.SELECT}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = d."U_CodPerfil"
       ORDER BY d."U_CodPerfil", d."U_TipDoc"`,
    );
    return rows.map(r => this.norm(r));
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
    return rows.map(r => this.norm(r));
  }

  async findOne(id: number): Promise<Documento | null> {
    const rows = await this.db.query<any>(
      `SELECT ${this.SELECT}
       FROM ${this.DB} d
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = d."U_CodPerfil"
       WHERE d."U_IdDocumento" = ?`,
      [id],
    );
    return rows[0] ? this.norm(rows[0]) : null;
  }

  async create(dto: CreateDocumentoDto): Promise<Documento> {
    // Obtener el siguiente ID
    const seqRows = await this.db.query<any>(
      `SELECT COALESCE(MAX("U_IdDocumento"), 0) + 1 AS NEXT_ID FROM ${this.DB}`,
    );
    const nextId = seqRows[0]?.NEXT_ID ?? 1;

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
    const current = await this.findOne(id);

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