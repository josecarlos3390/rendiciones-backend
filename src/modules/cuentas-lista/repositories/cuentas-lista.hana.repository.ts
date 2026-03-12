import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HanaService } from '../../../database/hana.service';
import { ICuentasListaRepository } from './cuentas-lista.repository.interface';
import { CuentaLista, CuentaListaDetalle } from '../interfaces/cuenta-lista.interface';
import { CreateCuentaListaDto } from '../dto/create-cuenta-lista.dto';

@Injectable()
export class CuentasListaHanaRepository implements ICuentasListaRepository {
  private readonly logger = new Logger(CuentasListaHanaRepository.name);

  private get schema(): string {
    return this.configService.get<string>('hana.schema');
  }
  private get DB(): string      { return `"${this.schema}"."REND_CTA_L"`; }
  private get DB_PERF(): string { return `"${this.schema}"."REND_PERFIL"`; }

  constructor(
    private readonly hanaService:   HanaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(): Promise<CuentaListaDetalle[]> {
    return this.hanaService.query<CuentaListaDetalle>(
      `SELECT c."U_IdPerfil", c."U_CuentaSys", c."U_Cuenta", c."U_NombreCuenta",
              c."U_Relevante", p."U_NombrePerfil"
       FROM ${this.DB} c
       LEFT JOIN ${this.DB_PERF} p ON p."U_CodPerfil" = c."U_IdPerfil"
       ORDER BY c."U_IdPerfil", c."U_Cuenta"`,
    );
  }

  async findByPerfil(idPerfil: number): Promise<CuentaLista[]> {
    return this.hanaService.query<CuentaLista>(
      `SELECT "U_IdPerfil", "U_CuentaSys", "U_Cuenta", "U_NombreCuenta", "U_Relevante"
       FROM ${this.DB}
       WHERE "U_IdPerfil" = ?
       ORDER BY "U_Cuenta"`,
      [idPerfil],
    );
  }

  async create(dto: CreateCuentaListaDto): Promise<CuentaLista> {
    await this.hanaService.execute(
      `INSERT INTO ${this.DB}
         ("U_IdPerfil", "U_CuentaSys", "U_Cuenta", "U_NombreCuenta", "U_Relevante")
       VALUES (?, ?, ?, ?, ?)`,
      [
        dto.idPerfil,
        dto.cuentaSys,
        dto.cuenta,
        dto.nombreCuenta,
        dto.relevante ?? 'N',
      ],
    );

    const rows = await this.hanaService.query<CuentaLista>(
      `SELECT "U_IdPerfil", "U_CuentaSys", "U_Cuenta", "U_NombreCuenta", "U_Relevante"
       FROM ${this.DB}
       WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [dto.idPerfil, dto.cuentaSys],
    );
    return rows[0];
  }

  async remove(idPerfil: number, cuentaSys: string): Promise<{ affected: number }> {
    const affected = await this.hanaService.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [idPerfil, cuentaSys],
    );
    return { affected };
  }

  async existsByPerfilAndCuenta(idPerfil: number, cuentaSys: string): Promise<boolean> {
    const rows = await this.hanaService.query<any>(
      `SELECT 1 FROM ${this.DB} WHERE "U_IdPerfil" = ? AND "U_CuentaSys" = ?`,
      [idPerfil, cuentaSys],
    );
    return rows.length > 0;
  }
}
