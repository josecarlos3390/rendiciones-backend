import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "@database/interfaces/database.interface";
import { tbl } from "@database/db-table.helper";
import { IPrctjRepository } from "./prctj.repository.interface";
import { RendPrctj } from "../interfaces/prctj.interface";
import { PrctjLineaDto } from "../dto/prctj.dto";

@Injectable()
export class PrctjHanaRepository implements IPrctjRepository {
  private readonly logger = new Logger(PrctjHanaRepository.name);

  private get schema(): string {
    return this.configService.get<string>("hana.schema");
  }
  private get dbType(): string {
    return this.configService.get<string>("app.dbType", "HANA").toUpperCase();
  }
  private get DB(): string {
    return tbl(this.schema, "REND_PRCTJ", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /** Obtiene todas las líneas de distribución de una línea REND_D */
  async findByLinea(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<RendPrctj[]> {
    return this.db.query<RendPrctj>(
      `SELECT
        "PRCT_RD_IDRD", "PRCT_RD_RM_IDREND", "PRCT_RD_IDUSER",
        "PRCT_IDLINEA", "PRCT_PORCENTAJE", "PRCT_MONTO",
        "PRCT_RD_CUENTA", "PRCT_RD_NOMCUENTA",
        "PRCT_RD_N1", "PRCT_RD_N2", "PRCT_RD_N3", "PRCT_RD_N4", "PRCT_RD_N5",
        "PRCT_RD_PROYECTO",
        "PRCT_RD_AUXILIAR1", "PRCT_RD_AUXILIAR2", "PRCT_RD_AUXILIAR3", "PRCT_RD_AUXILIAR4"
       FROM ${this.DB}
       WHERE "PRCT_RD_RM_IDREND" = ? AND "PRCT_RD_IDRD" = ? AND "PRCT_RD_IDUSER" = ?
       ORDER BY "PRCT_IDLINEA" ASC`,
      [idRendicion, idRD, idUsuario],
    );
  }

  /** Verifica si una línea REND_D ya tiene distribución */
  async tieneDistribucion(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<boolean> {
    const rows = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt" FROM ${this.DB}
       WHERE "PRCT_RD_RM_IDREND" = ? AND "PRCT_RD_IDRD" = ? AND "PRCT_RD_IDUSER" = ?`,
      [idRendicion, idRD, idUsuario],
    );
    return (this.db.col(rows[0], "cnt") ?? 0) > 0;
  }

  /** Elimina todas las distribuciones de una línea REND_D */
  async deleteByLinea(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
  ): Promise<void> {
    await this.db.execute(
      `DELETE FROM ${this.DB}
       WHERE "PRCT_RD_RM_IDREND" = ? AND "PRCT_RD_IDRD" = ? AND "PRCT_RD_IDUSER" = ?`,
      [idRendicion, idRD, idUsuario],
    );
  }

  /** Inserta todas las líneas de distribución (se llama después de deleteByLinea) */
  async insertLineas(
    idRendicion: number,
    idRD: number,
    idUsuario: number,
    importe: number,
    lineas: PrctjLineaDto[],
  ): Promise<void> {
    for (const l of lineas) {
      const monto = Math.round(((importe * l.porcentaje) / 100) * 100) / 100;
      await this.db.execute(
        `INSERT INTO ${this.DB} (
          "PRCT_RD_IDRD", "PRCT_RD_RM_IDREND", "PRCT_RD_IDUSER",
          "PRCT_IDLINEA", "PRCT_PORCENTAJE", "PRCT_MONTO",
          "PRCT_RD_CUENTA", "PRCT_RD_NOMCUENTA",
          "PRCT_RD_N1", "PRCT_RD_N2", "PRCT_RD_N3", "PRCT_RD_N4", "PRCT_RD_N5",
          "PRCT_RD_PROYECTO",
          "PRCT_RD_AUXILIAR1", "PRCT_RD_AUXILIAR2", "PRCT_RD_AUXILIAR3", "PRCT_RD_AUXILIAR4"
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          idRD,
          idRendicion,
          idUsuario,
          l.linea,
          l.porcentaje,
          monto,
          l.cuenta,
          l.nomCuenta ?? "",
          l.n1 ?? "",
          l.n2 ?? "",
          l.n3 ?? "",
          l.n4 ?? "",
          l.n5 ?? "",
          l.proyecto ?? "",
          l.auxiliar1 ?? "",
          l.auxiliar2 ?? "",
          l.auxiliar3 ?? "",
          l.auxiliar4 ?? "",
        ],
      );
    }
    this.logger.log(
      `REND_PRCTJ: ${lineas.length} líneas insertadas para RD=${idRD} Rend=${idRendicion}`,
    );
  }

  /** Elimina todas las distribuciones de una rendición completa (al borrar REND_D) */
  async deleteByRendicion(idRendicion: number): Promise<void> {
    await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "PRCT_RD_RM_IDREND" = ?`,
      [idRendicion],
    );
  }
}
