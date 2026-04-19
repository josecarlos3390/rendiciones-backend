import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from "@database/interfaces/database.interface";
import { tbl } from "@database/db-table.helper";
import {
  IIntegracionRepository,
  RendSync,
  RendicionPendiente,
} from "./integracion.repository.interface";
import { getTableMutex } from "../../../common/utils/db-mutex";

@Injectable()
export class IntegracionHanaRepository implements IIntegracionRepository {
  private get schema(): string {
    return this.configService.get<string>("hana.schema");
  }
  private get dbType(): string {
    return this.configService.get<string>("app.dbType", "HANA").toUpperCase();
  }
  private get DB(): string {
    return tbl(this.schema, "REND_SYNC", this.dbType);
  }
  private get DB_M(): string {
    return tbl(this.schema, "REND_M", this.dbType);
  }
  private get DB_U(): string {
    return tbl(this.schema, "REND_U", this.dbType);
  }

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private normalize(row: Record<string, any>): RendSync {
    const col = (name: string) => this.db.col(row, name);
    return {
      U_IdSync: Number(col("U_IdSync")),
      U_IdRendicion: Number(col("U_IdRendicion")),
      U_Estado: String(col("U_Estado") ?? "PENDIENTE"),
      U_NroDocERP: col("U_NroDocERP") ? String(col("U_NroDocERP")) : null,
      U_FechaSync: col("U_FechaSync") ? String(col("U_FechaSync")) : null,
      U_LoginAdmin: col("U_LoginAdmin") ? String(col("U_LoginAdmin")) : null,
      U_Mensaje: col("U_Mensaje") ? String(col("U_Mensaje")) : null,
      U_Intento: Number(col("U_Intento") ?? 1),
    };
  }

  async findByRendicion(idRendicion: number): Promise<RendSync[]> {
    const rows = await this.db.query(
      `SELECT "U_IdSync","U_IdRendicion","U_Estado","U_NroDocERP",
              "U_FechaSync","U_LoginAdmin","U_Mensaje","U_Intento"
       FROM ${this.DB}
       WHERE "U_IdRendicion" = ?
       ORDER BY "U_IdSync" DESC`,
      [idRendicion],
    );
    return rows.map((r) => this.normalize(r));
  }

  async findMisRendiciones(idUsuario: string): Promise<RendicionPendiente[]> {
    const rows = await this.db.query(
      `SELECT m."U_IdRendicion", m."U_IdUsuario", m."U_NomUsuario",
              m."U_NombrePerfil", m."U_Objetivo",
              m."U_FechaIni", m."U_FechaFinal", m."U_Monto", m."U_Estado",
              s."U_NroDocERP"
       FROM ${this.DB_M} m
       LEFT JOIN ${this.DB} s
         ON s."U_IdRendicion" = m."U_IdRendicion"
         AND s."U_Estado" = 'OK'
         AND s."U_IdSync" = (
           SELECT MAX(s2."U_IdSync") FROM ${this.DB} s2
           WHERE s2."U_IdRendicion" = m."U_IdRendicion" AND s2."U_Estado" = 'OK'
         )
       WHERE m."U_Estado" IN (7, 5, 6)
         AND m."U_IdUsuario" = ?
       ORDER BY m."U_FechaMod" DESC`,
      [idUsuario],
    );
    return rows.map((r) => {
      const col = (name: string) => this.db.col(r, name);
      return {
        U_IdRendicion: Number(col("U_IdRendicion")),
        U_IdUsuario: String(col("U_IdUsuario")),
        U_NomUsuario: String(col("U_NomUsuario") ?? ""),
        U_NombrePerfil: String(col("U_NombrePerfil") ?? ""),
        U_Objetivo: String(col("U_Objetivo") ?? ""),
        U_FechaIni: String(col("U_FechaIni") ?? ""),
        U_FechaFinal: String(col("U_FechaFinal") ?? ""),
        U_Monto: Number(col("U_Monto") ?? 0),
        U_Estado: Number(col("U_Estado") ?? 0),
        U_NroDocERP: col("U_NroDocERP") ? String(col("U_NroDocERP")) : null,
      };
    });
  }

  async findPendientes(): Promise<RendicionPendiente[]> {
    const rows = await this.db.query(
      `SELECT m."U_IdRendicion", m."U_IdUsuario", m."U_NomUsuario",
              m."U_NombrePerfil", m."U_Objetivo",
              m."U_FechaIni", m."U_FechaFinal", m."U_Monto", m."U_Estado"
       FROM ${this.DB_M} m
       WHERE m."U_Estado" IN (7, 6)
       ORDER BY m."U_FechaMod" DESC`,
      [],
    );
    return rows.map((r) => {
      const col = (name: string) => this.db.col(r, name);
      return {
        U_IdRendicion: Number(col("U_IdRendicion")),
        U_IdUsuario: String(col("U_IdUsuario")),
        U_NomUsuario: String(col("U_NomUsuario") ?? ""),
        U_NombrePerfil: String(col("U_NombrePerfil") ?? ""),
        U_Objetivo: String(col("U_Objetivo") ?? ""),
        U_FechaIni: String(col("U_FechaIni") ?? ""),
        U_FechaFinal: String(col("U_FechaFinal") ?? ""),
        U_Monto: Number(col("U_Monto") ?? 0),
        U_Estado: Number(col("U_Estado") ?? 0),
      };
    });
  }

  /**
   * Obtiene todos los logins de la jerarquía de subordinados en cascada.
   */
  private async getSubordinadosEnCascada(
    loginAprobador: string,
  ): Promise<string[]> {
    const todos = new Set<string>();
    const cola = [loginAprobador.toLowerCase()];
    const visitados = new Set<string>();

    while (cola.length > 0) {
      const login = cola.shift()!;
      if (visitados.has(login)) continue;
      visitados.add(login);

      const rows = await this.db.query(
        `SELECT CAST("U_IdU" AS VARCHAR) AS "idU", LOWER("U_Login") AS "login"
         FROM ${this.DB_U}
         WHERE LOWER("U_NomSup") = ?`,
        [login],
      );
      for (const r of rows) {
        const idU = String(this.db.col(r, "idU"));
        const subLogin = String(this.db.col(r, "login") ?? "");
        if (idU) todos.add(idU);
        if (subLogin && !visitados.has(subLogin)) cola.push(subLogin);
      }
    }
    return Array.from(todos);
  }

  async findPendientesByAprobador(
    loginAprob: string,
    cascada: boolean,
  ): Promise<RendicionPendiente[]> {
    const conditions: string[] = [`m."U_Estado" IN (7, 6)`];
    const params: unknown[] = [];

    if (cascada) {
      const subIds = await this.getSubordinadosEnCascada(loginAprob);
      if (subIds.length > 0) {
        conditions.push(
          `m."U_IdUsuario" IN (${subIds.map(() => "?").join(",")})`,
        );
        params.push(...subIds);
      } else {
        return [];
      }
    } else {
      // Solo subordinados directos
      conditions.push(
        `EXISTS (SELECT 1 FROM ${this.DB_U} u WHERE LOWER(u."U_NomSup") = LOWER(?) AND CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario")`,
      );
      params.push(loginAprob);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const rows = await this.db.query(
      `SELECT m."U_IdRendicion", m."U_IdUsuario", m."U_NomUsuario",
              m."U_NombrePerfil", m."U_Objetivo",
              m."U_FechaIni", m."U_FechaFinal", m."U_Monto", m."U_Estado"
       FROM ${this.DB_M} m
       ${where}
       ORDER BY m."U_FechaMod" DESC`,
      params,
    );
    return rows.map((r) => {
      const col = (name: string) => this.db.col(r, name);
      return {
        U_IdRendicion: Number(col("U_IdRendicion")),
        U_IdUsuario: String(col("U_IdUsuario")),
        U_NomUsuario: String(col("U_NomUsuario") ?? ""),
        U_NombrePerfil: String(col("U_NombrePerfil") ?? ""),
        U_Objetivo: String(col("U_Objetivo") ?? ""),
        U_FechaIni: String(col("U_FechaIni") ?? ""),
        U_FechaFinal: String(col("U_FechaFinal") ?? ""),
        U_Monto: Number(col("U_Monto") ?? 0),
        U_Estado: Number(col("U_Estado") ?? 0),
      };
    });
  }

  async countPendientes(): Promise<number> {
    const row = await this.db.queryOne(
      `SELECT COUNT(*) AS "total" FROM ${this.DB_M}
       WHERE "U_Estado" IN (3, 6)`,
      [],
    );
    return Number(this.db.col(row, "total") ?? 0);
  }

  async countPendientesByAprobador(
    loginAprob: string,
    cascada: boolean,
  ): Promise<number> {
    const conditions: string[] = [`"U_Estado" IN (7, 6)`];
    const params: unknown[] = [];

    if (cascada) {
      const subIds = await this.getSubordinadosEnCascada(loginAprob);
      if (subIds.length > 0) {
        conditions.push(
          `"U_IdUsuario" IN (${subIds.map(() => "?").join(",")})`,
        );
        params.push(...subIds);
      } else {
        return 0;
      }
    } else {
      conditions.push(
        `EXISTS (SELECT 1 FROM ${this.DB_U} u WHERE LOWER(u."U_NomSup") = LOWER(?) AND CAST(u."U_IdU" AS VARCHAR) = "U_IdUsuario")`,
      );
      params.push(loginAprob);
    }

    const row = await this.db.queryOne(
      `SELECT COUNT(*) AS "total" FROM ${this.DB_M}
       WHERE ${conditions.join(" AND ")}`,
      params,
    );
    return Number(this.db.col(row, "total") ?? 0);
  }

  async create(data: {
    idRendicion: number;
    estado: string;
    nroDocERP?: string;
    loginAdmin: string;
    mensaje?: string;
    intento: number;
  }): Promise<RendSync> {
    const mutex = getTableMutex("REND_SYNC");

    return mutex.runExclusive(async () => {
      const idRows = await this.db.query(
        `SELECT COALESCE(MAX("U_IdSync"), 0) + 1 AS "newId" FROM ${this.DB}`,
      );
      const newId = Number(this.db.col(idRows[0], "newId")) || 1;
      const now = new Date().toISOString();

      await this.db.execute(
        `INSERT INTO ${this.DB}
          ("U_IdSync","U_IdRendicion","U_Estado","U_NroDocERP",
            "U_FechaSync","U_LoginAdmin","U_Mensaje","U_Intento")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          data.idRendicion,
          data.estado,
          data.nroDocERP ?? null,
          now,
          data.loginAdmin,
          data.mensaje ?? null,
          data.intento,
        ],
      );

      const rows = await this.db.query(
        `SELECT * FROM ${this.DB} WHERE "U_IdSync" = ?`,
        [newId],
      );
      return this.normalize(rows[0]);
    });
  }
}
