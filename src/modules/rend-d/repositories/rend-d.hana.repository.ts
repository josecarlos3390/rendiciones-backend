import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
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

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }

  private get DB(): string {
    return `"${this.schema}"."REND_D"`;
  }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findByRendicion(idRendicion: number): Promise<RendD[]> {
    return this.hanaService.query<RendD>(
      `SELECT ${SAFE_COLS} FROM ${this.DB}
       WHERE "U_RD_RM_IdRendicion" = ?
       ORDER BY "U_RD_IdRD"`,
      [idRendicion],
    );
  }

  async findOne(idRD: number): Promise<RendD | null> {
    const rows = await this.hanaService.query<RendD>(
      `SELECT ${SAFE_COLS} FROM ${this.DB} WHERE "U_RD_IdRD" = ?`,
      [idRD],
    );
    return rows[0] ?? null;
  }

  async create(idRendicion: number, idUsuario: number, dto: CreateRendDDto): Promise<RendD | null> {
    await this.hanaService.execute(
      `INSERT INTO ${this.DB} (
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
        idRendicion,        idUsuario,
        dto.cuenta          ?? null,  dto.nombreCuenta  ?? null,  dto.concepto,
        dto.importe,        dto.descuento,                        dto.tasaCero    ?? 0,
        dto.n1              ?? '',    dto.n2            ?? '',    dto.n3          ?? '',
        dto.n4              ?? '',    dto.n5            ?? '',
        dto.proyecto        ?? null,  dto.fecha,
        dto.idTipoDoc,      dto.idDoc ?? null,                    dto.tipoDoc,
        dto.partida         ?? null,  dto.exento        ?? 0,
        // U_RD_Estado = 0 hardcodeado arriba
        dto.impRet          ?? 0,     dto.total         ?? null,
        dto.numDocumento    ?? null,  dto.nroAutor      ?? null,  dto.ctrl        ?? null,
        dto.nit,            dto.codProv ?? null,                  dto.prov        ?? null,
        dto.montoIVA,       dto.montoIT,       dto.montoIUE,      dto.montoRCIVA,
        dto.cuentaIVA       ?? null,  dto.cuentaIT      ?? null,
        dto.cuentaIUE       ?? null,  dto.cuentaRCIVA   ?? null,
        dto.importeBs       ?? null,  dto.exentoBs      ?? null,  dto.desctoBs    ?? null,
        // U_RD_Marcado = 0 hardcodeado arriba
        dto.ctaExento,
        dto.auxiliar1       ?? '',    dto.auxiliar2     ?? '',
        dto.auxiliar3       ?? '',    dto.auxiliar4     ?? '',
        dto.tasa            ?? null,  dto.cuf           ?? null,
        dto.giftCard        ?? null,  dto.ice,          dto.nroOT ?? '',
      ],
    );

    const idRows = await this.hanaService.query<Record<string, number>>(
      `SELECT CURRENT_IDENTITY_VALUE() AS "newId" FROM DUMMY`,
    );
    const newId = HanaService.col(idRows[0], 'newId');
    this.logger.log(`REND_D creado: ID ${newId} — rendición ${idRendicion}`);
    return this.findOne(newId);
  }

  async update(idRD: number, dto: UpdateRendDDto): Promise<{ affected: number }> {
    const setParts: string[] = [];
    const params:   any[]    = [];

    if (dto.cuenta         !== undefined) { setParts.push('"U_RD_Cuenta" = ?');        params.push(dto.cuenta); }
    if (dto.nombreCuenta   !== undefined) { setParts.push('"U_RD_NombreCuenta" = ?');  params.push(dto.nombreCuenta); }
    if (dto.concepto       !== undefined) { setParts.push('"U_RD_Concepto" = ?');      params.push(dto.concepto); }
    if (dto.fecha          !== undefined) { setParts.push('"U_RD_Fecha" = ?');         params.push(dto.fecha); }
    if (dto.idTipoDoc      !== undefined) { setParts.push('"U_RD_IdTipoDoc" = ?');     params.push(dto.idTipoDoc); }
    if (dto.tipoDoc        !== undefined) { setParts.push('"U_RD_TipoDoc" = ?');       params.push(dto.tipoDoc); }
    if (dto.idDoc          !== undefined) { setParts.push('"U_RD_IdDoc" = ?');         params.push(dto.idDoc); }
    if (dto.numDocumento   !== undefined) { setParts.push('"U_RD_NumDocumento" = ?');  params.push(dto.numDocumento); }
    if (dto.nroAutor       !== undefined) { setParts.push('"U_RD_NroAutor" = ?');      params.push(dto.nroAutor); }
    if (dto.ctrl           !== undefined) { setParts.push('"U_RD_Ctrl" = ?');          params.push(dto.ctrl); }
    if (dto.cuf            !== undefined) { setParts.push('"U_CUF" = ?');              params.push(dto.cuf); }
    if (dto.importe        !== undefined) { setParts.push('"U_RD_Importe" = ?');       params.push(dto.importe); }
    if (dto.descuento      !== undefined) { setParts.push('"U_RD_Descuento" = ?');     params.push(dto.descuento); }
    if (dto.tasaCero       !== undefined) { setParts.push('"U_RD_TasaCero" = ?');      params.push(dto.tasaCero); }
    if (dto.exento         !== undefined) { setParts.push('"U_RD_Exento" = ?');        params.push(dto.exento); }
    if (dto.impRet         !== undefined) { setParts.push('"U_RD_ImpRet" = ?');        params.push(dto.impRet); }
    if (dto.total          !== undefined) { setParts.push('"U_RD_Total" = ?');         params.push(dto.total); }
    if (dto.importeBs      !== undefined) { setParts.push('"U_ImporteBs" = ?');        params.push(dto.importeBs); }
    if (dto.exentoBs       !== undefined) { setParts.push('"U_EXENTOBS" = ?');         params.push(dto.exentoBs); }
    if (dto.desctoBs       !== undefined) { setParts.push('"U_DESCTOBS" = ?');         params.push(dto.desctoBs); }
    if (dto.tasa           !== undefined) { setParts.push('"U_TASA" = ?');             params.push(dto.tasa); }
    if (dto.giftCard       !== undefined) { setParts.push('"U_GIFTCARD" = ?');         params.push(dto.giftCard); }
    if (dto.montoIVA       !== undefined) { setParts.push('"U_MontoIVA" = ?');         params.push(dto.montoIVA); }
    if (dto.montoIT        !== undefined) { setParts.push('"U_MontoIT" = ?');          params.push(dto.montoIT); }
    if (dto.montoIUE       !== undefined) { setParts.push('"U_MontoIUE" = ?');         params.push(dto.montoIUE); }
    if (dto.montoRCIVA     !== undefined) { setParts.push('"U_MontoRCIVA" = ?');       params.push(dto.montoRCIVA); }
    if (dto.ice            !== undefined) { setParts.push('"U_ICE" = ?');              params.push(dto.ice); }
    if (dto.cuentaIVA      !== undefined) { setParts.push('"U_CuentaIVA" = ?');        params.push(dto.cuentaIVA); }
    if (dto.cuentaIT       !== undefined) { setParts.push('"U_CuentaIT" = ?');         params.push(dto.cuentaIT); }
    if (dto.cuentaIUE      !== undefined) { setParts.push('"U_CuentaIUE" = ?');        params.push(dto.cuentaIUE); }
    if (dto.cuentaRCIVA    !== undefined) { setParts.push('"U_CuentaRCIVA" = ?');      params.push(dto.cuentaRCIVA); }
    if (dto.ctaExento      !== undefined) { setParts.push('"U_CTAEXENTO" = ?');        params.push(dto.ctaExento); }
    if (dto.nit            !== undefined) { setParts.push('"U_RD_NIT" = ?');           params.push(dto.nit); }
    if (dto.codProv        !== undefined) { setParts.push('"U_RD_CodProv" = ?');       params.push(dto.codProv); }
    if (dto.prov           !== undefined) { setParts.push('"U_RD_Prov" = ?');          params.push(dto.prov); }
    if (dto.n1             !== undefined) { setParts.push('"U_RD_N1" = ?');            params.push(dto.n1); }
    if (dto.n2             !== undefined) { setParts.push('"U_RD_N2" = ?');            params.push(dto.n2); }
    if (dto.n3             !== undefined) { setParts.push('"U_RD_N3" = ?');            params.push(dto.n3); }
    if (dto.n4             !== undefined) { setParts.push('"U_RD_N4" = ?');            params.push(dto.n4); }
    if (dto.n5             !== undefined) { setParts.push('"U_RD_N5" = ?');            params.push(dto.n5); }
    if (dto.proyecto       !== undefined) { setParts.push('"U_RD_Proyecto" = ?');      params.push(dto.proyecto); }
    if (dto.partida        !== undefined) { setParts.push('"U_RD_Partida" = ?');       params.push(dto.partida); }
    if (dto.nroOT          !== undefined) { setParts.push('"U_RD_NRO_OT" = ?');        params.push(dto.nroOT); }
    if (dto.auxiliar1      !== undefined) { setParts.push('"U_RD_AUXILIAR1" = ?');     params.push(dto.auxiliar1); }
    if (dto.auxiliar2      !== undefined) { setParts.push('"U_RD_AUXILIAR2" = ?');     params.push(dto.auxiliar2); }
    if (dto.auxiliar3      !== undefined) { setParts.push('"U_RD_AUXILIAR3" = ?');     params.push(dto.auxiliar3); }
    if (dto.auxiliar4      !== undefined) { setParts.push('"U_RD_AUXILIAR4" = ?');     params.push(dto.auxiliar4); }

    if (!setParts.length) return { affected: 0 };

    params.push(idRD);
    const affected = await this.hanaService.execute(
      `UPDATE ${this.DB} SET ${setParts.join(', ')} WHERE "U_RD_IdRD" = ?`,
      params,
    );
    return { affected };
  }

  async remove(idRD: number): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM ${this.DB} WHERE "U_RD_IdRD" = ?`,
      [idRD],
    );
    return { affected };
  }
}
