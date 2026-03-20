import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';
import { ICuentasCabeceraRepository } from './cuentas-cabecera.repository.interface';
import { CuentaCabecera } from '../interfaces/cuenta-cabecera.interface';
import { CreateCuentaCabeceraDto } from '../dto/create-cuenta-cabecera.dto';

@Injectable()
export class CuentasCabeceraHanaRepository implements ICuentasCabeceraRepository {
  private readonly logger = new Logger(CuentasCabeceraHanaRepository.name);

  private get schema(): string { return this.configService.get<string>('hana.schema'); }
  private get dbType(): string {
    return this.configService.get<string>('app.dbType', 'HANA').toUpperCase();
  }

  private get DB(): string      { return tbl(this.schema, 'REND_CTA_M', this.dbType); }
  private get DB_PERF(): string      { return tbl(this.schema, 'REND_PERFIL', this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<CuentaCabecera[]> {
    return this.db.query<CuentaCabecera>(
      `SELECT c."U_IdPerfil", c."U_CuentaSys", c."U_CuentaFormatCode",
              c."U_CuentaNombre", c."U_CuentaAsociada", p."U_NombrePerfil"
       FROM ${this.DB} c
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = c."U_IdPerfil"
       ORDER BY c."U_IdPerfil", c."U_CuentaFormatCode"`,
    );
  }

  async findByPerfil(idPerfil: number): Promise<CuentaCabecera[]> {
    return this.db.query<CuentaCabecera>(
      `SELECT "U_IdPerfil", "U_CuentaSys", "U_CuentaFormatCode",
              "U_CuentaNombre", "U_CuentaAsociada"
       FROM ${this.DB}
       WHERE "U_IdPerfil" = ?
       ORDER BY "U_CuentaFormatCode"`,
      [idPerfil],
    );
  }

  async create(dto: CreateCuentaCabeceraDto): Promise<CuentaCabecera> {
    await this.db.execute(
      `INSERT INTO ${this.DB}
         ("U_IdPerfil", "U_CuentaSys", "U_CuentaFormatCode", "U_CuentaNombre", "U_CuentaAsociada")
       VALUES (?, ?, ?, ?, ?)`,
      [
        dto.idPerfil,
        dto.cuentaSys,
        dto.cuentaFormatCode,
        dto.cuentaNombre,
        dto.cuentaAsociada ?? 'N',
      ],
    );
    const rows = await this.db.query<CuentaCabecera>(
      `SELECT "U_IdPerfil", "U_CuentaSys", "U_CuentaFormatCode",
              "U_CuentaNombre", "U_CuentaAsociada"
       FROM ${this.DB}
       WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [dto.idPerfil, dto.cuentaSys],
    );
    return rows[0];
  }

  async remove(idPerfil: number, cuentaSys: string): Promise<{ affected: number }> {
    const affected = await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [idPerfil, cuentaSys],
    );
    return { affected };
  }

  async exists(idPerfil: number, cuentaSys: string): Promise<boolean> {
    const rows = await this.db.query<any>(
      `SELECT 1 FROM ${this.DB} WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [idPerfil, cuentaSys],
    );
    return rows.length > 0;
  }
}