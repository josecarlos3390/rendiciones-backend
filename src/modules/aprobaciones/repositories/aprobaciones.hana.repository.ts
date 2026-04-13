import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../../database/interfaces/database.interface';
import { tbl } from '../../../database/db-table.helper';

export interface Aprobacion {
  U_IdRendicion: number;
  U_Nivel:       number;
  U_LoginAprob:  string;
  U_NomAprob:    string;
  U_Estado:      string;
  U_FechaAprob:  string | null;
  U_Comentario:  string | null;
}

export interface AprobacionConRendicion extends Aprobacion {
  U_IdUsuario:    number;
  U_NomUsuario:   string;
  U_NombrePerfil: string;
  U_Objetivo:     string;
  U_FechaIni:     string;
  U_FechaFinal:   string;
  U_Monto:        number;
  U_Estado_Rend:  number;
}

@Injectable()
export class AprobacionesHanaRepository {
  private readonly logger = new Logger(AprobacionesHanaRepository.name);

  private get schema(): string { return this.config.get<string>('hana.schema'); }
  private get dbType(): string { return (this.config.get<string>('app.dbType') ?? 'HANA').toUpperCase(); }
  private get DB(): string     { return tbl(this.schema, 'REND_APROBACION', this.dbType); }
  private get DB_M(): string   { return tbl(this.schema, 'REND_M',          this.dbType); }
  private get DB_U(): string   { return tbl(this.schema, 'REND_U',          this.dbType); }

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  private norm(row: any): Aprobacion {
    const c = (n: string) => this.db.col(row, n);
    return {
      U_IdRendicion: Number(c('U_IdRendicion')),
      U_Nivel:       Number(c('U_Nivel')),
      U_LoginAprob:  c('U_LoginAprob')  ?? '',
      U_NomAprob:    c('U_NomAprob')    ?? '',
      U_Estado:      c('U_Estado')      ?? 'PENDIENTE',
      U_FechaAprob:  c('U_FechaAprob')  ?? null,
      U_Comentario:  c('U_Comentario')  ?? null,
    };
  }

  /** Obtiene todos los niveles de aprobación de una rendición */
  async findByRendicion(idRendicion: number): Promise<Aprobacion[]> {
    const rows = await this.db.query<any>(
      `SELECT "U_IdRendicion","U_Nivel","U_LoginAprob","U_NomAprob",
              "U_Estado","U_FechaAprob","U_Comentario"
       FROM ${this.DB} WHERE "U_IdRendicion" = ?
       ORDER BY "U_Nivel"`,
      [idRendicion],
    );
    return rows.map(r => this.norm(r));
  }

  /** Inserta todos los niveles de aprobación al enviar una rendición */
  async createNiveles(niveles: Omit<Aprobacion, 'U_Estado' | 'U_FechaAprob' | 'U_Comentario'>[]): Promise<void> {
    for (const n of niveles) {
      await this.db.execute(
        `INSERT INTO ${this.DB}
           ("U_IdRendicion","U_Nivel","U_LoginAprob","U_NomAprob","U_Estado")
         VALUES (?, ?, ?, ?, 'PENDIENTE')`,
        [n.U_IdRendicion, n.U_Nivel, n.U_LoginAprob, n.U_NomAprob],
      );
    }
  }

  /** Elimina todos los niveles de una rendición (para reenvío tras rechazo) */
  async deleteByRendicion(idRendicion: number): Promise<void> {
    await this.db.execute(
      `DELETE FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [idRendicion],
    );
  }

  /** Aprueba o rechaza un nivel específico */
  async updateEstado(
    idRendicion: number,
    nivel: number,
    estado: 'APROBADO' | 'RECHAZADO',
    comentario?: string,
  ): Promise<void> {
    await this.db.execute(
      `UPDATE ${this.DB}
       SET "U_Estado" = ?, "U_FechaAprob" = CURRENT_TIMESTAMP, "U_Comentario" = ?
       WHERE "U_IdRendicion" = ? AND "U_Nivel" = ?`,
      [estado, comentario ?? null, idRendicion, nivel],
    );
  }

  /** Verifica si todos los niveles están aprobados */
  async allApproved(idRendicion: number): Promise<boolean> {
    const rows = await this.db.query<any>(
      `SELECT COUNT(*) AS "total",
              SUM(CASE WHEN "U_Estado" = 'APROBADO' THEN 1 ELSE 0 END) AS "aprobados"
       FROM ${this.DB} WHERE "U_IdRendicion" = ?`,
      [idRendicion],
    );
    const total    = Number(this.db.col(rows[0], 'total'))    || 0;
    const aprobados = Number(this.db.col(rows[0], 'aprobados')) || 0;
    return total > 0 && total === aprobados;
  }

  /** Rendiciones pendientes para un aprobador — solo el siguiente nivel activo */
  async findPendientesParaAprobador(loginAprob: string): Promise<AprobacionConRendicion[]> {
    // 1) Aprobaciones formales desde REND_APROBACION
    // NOTA: Se hace JOIN con REND_U para validar que el usuario de la rendición
    // sea subordinado del aprobador (evita cruzar rendiciones con mismo ID numérico)
    const rowsFormales = await this.db.query<any>(
      `SELECT a."U_IdRendicion", a."U_Nivel", a."U_LoginAprob", a."U_NomAprob",
              a."U_Estado", a."U_FechaAprob", a."U_Comentario",
              m."U_IdUsuario", m."U_NomUsuario", m."U_NombrePerfil",
              m."U_Objetivo", m."U_FechaIni", m."U_FechaFinal",
              m."U_Monto", m."U_Estado" AS "U_Estado_Rend", m."U_IdPerfil"
       FROM ${this.DB} a
       JOIN ${this.DB_M} m ON m."U_IdRendicion" = a."U_IdRendicion"
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE LOWER(a."U_LoginAprob") = LOWER(?)
         AND a."U_Estado" = 'PENDIENTE'
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND (
           a."U_Nivel" = 1
           OR NOT EXISTS (
             SELECT 1 FROM ${this.DB} prev
             WHERE prev."U_IdRendicion" = a."U_IdRendicion"
               AND prev."U_Nivel" = a."U_Nivel" - 1
               AND prev."U_Estado" != 'APROBADO'
           )
         )
       ORDER BY m."U_FechaIni" DESC`,
      [loginAprob, loginAprob],
    );

    const formales = rowsFormales.map(r => ({
      ...this.norm(r),
      U_IdUsuario:    Number(this.db.col(r, 'U_IdUsuario')),
      U_NomUsuario:   this.db.col(r, 'U_NomUsuario')   ?? '',
      U_NombrePerfil: this.db.col(r, 'U_NombrePerfil') ?? '',
      U_Objetivo:     this.db.col(r, 'U_Objetivo')     ?? '',
      U_FechaIni:     this.db.col(r, 'U_FechaIni')     ?? '',
      U_FechaFinal:   this.db.col(r, 'U_FechaFinal')   ?? '',
      U_Monto:        Number(this.db.col(r, 'U_Monto')) || 0,
      U_Estado_Rend:  Number(this.db.col(r, 'U_Estado_Rend')),
    }));

    // 2) Fallback: rendiciones ENVIADAS de subordinados directos que NO tengan REND_APROBACION
    //    (datos históricos o casos donde no se generó la cadena de aprobación)
    const rowsFallback = await this.db.query<any>(
      `SELECT
         m."U_IdRendicion",
         1 AS "U_Nivel",
         ? AS "U_LoginAprob",
         '' AS "U_NomAprob",
         'PENDIENTE' AS "U_Estado",
         NULL AS "U_FechaAprob",
         NULL AS "U_Comentario",
         m."U_IdUsuario", m."U_NomUsuario", m."U_NombrePerfil",
         m."U_Objetivo", m."U_FechaIni", m."U_FechaFinal",
         m."U_Monto", m."U_Estado" AS "U_Estado_Rend", m."U_IdPerfil"
       FROM ${this.DB_M} m
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE m."U_Estado" = 4
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND NOT EXISTS (
           SELECT 1 FROM ${this.DB} a
           WHERE a."U_IdRendicion" = m."U_IdRendicion"
         )
       ORDER BY m."U_FechaIni" DESC`,
      [loginAprob, loginAprob],
    );

    const fallback = rowsFallback.map(r => ({
      ...this.norm(r),
      U_IdUsuario:    Number(this.db.col(r, 'U_IdUsuario')),
      U_NomUsuario:   this.db.col(r, 'U_NomUsuario')   ?? '',
      U_NombrePerfil: this.db.col(r, 'U_NombrePerfil') ?? '',
      U_Objetivo:     this.db.col(r, 'U_Objetivo')     ?? '',
      U_FechaIni:     this.db.col(r, 'U_FechaIni')     ?? '',
      U_FechaFinal:   this.db.col(r, 'U_FechaFinal')   ?? '',
      U_Monto:        Number(this.db.col(r, 'U_Monto')) || 0,
      U_Estado_Rend:  Number(this.db.col(r, 'U_Estado_Rend')),
    }));

    // Concatenar y eliminar duplicados por U_IdRendicion (priorizar formales)
    const mapa = new Map<number, AprobacionConRendicion>();
    for (const f of formales) mapa.set(f.U_IdRendicion, f);
    for (const f of fallback) if (!mapa.has(f.U_IdRendicion)) mapa.set(f.U_IdRendicion, f);

    return Array.from(mapa.values()).sort((a, b) => b.U_IdRendicion - a.U_IdRendicion);
  }

  /** Rendiciones pendientes de nivel 2 para un aprobador (ya aprobadas por nivel 1) */
  async findPendientesNivel2(loginAprob: string): Promise<AprobacionConRendicion[]> {
    const rows = await this.db.query<any>(
      `SELECT a."U_IdRendicion", a."U_Nivel", a."U_LoginAprob", a."U_NomAprob",
              a."U_Estado", a."U_FechaAprob", a."U_Comentario",
              m."U_IdUsuario", m."U_NomUsuario", m."U_NombrePerfil",
              m."U_Objetivo", m."U_FechaIni", m."U_FechaFinal",
              m."U_Monto", m."U_Estado" AS "U_Estado_Rend", m."U_IdPerfil"
       FROM ${this.DB} a
       JOIN ${this.DB_M} m ON m."U_IdRendicion" = a."U_IdRendicion"
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE LOWER(a."U_LoginAprob") = LOWER(?)
         AND a."U_Estado" = 'PENDIENTE'
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND a."U_Nivel" > 1
         AND EXISTS (
           SELECT 1 FROM ${this.DB} prev
           WHERE prev."U_IdRendicion" = a."U_IdRendicion"
             AND prev."U_Nivel" = a."U_Nivel" - 1
             AND prev."U_Estado" = 'APROBADO'
         )
       ORDER BY m."U_FechaIni" DESC`,
      [loginAprob, loginAprob],
    );
    return rows.map(r => ({
      ...this.norm(r),
      U_IdUsuario:    Number(this.db.col(r, 'U_IdUsuario')),
      U_NomUsuario:   this.db.col(r, 'U_NomUsuario')   ?? '',
      U_NombrePerfil: this.db.col(r, 'U_NombrePerfil') ?? '',
      U_Objetivo:     this.db.col(r, 'U_Objetivo')     ?? '',
      U_FechaIni:     this.db.col(r, 'U_FechaIni')     ?? '',
      U_FechaFinal:   this.db.col(r, 'U_FechaFinal')   ?? '',
      U_Monto:        Number(this.db.col(r, 'U_Monto')) || 0,
      U_Estado_Rend:  Number(this.db.col(r, 'U_Estado_Rend')),
    }));
  }

  /** Obtiene los perfiles que tiene asignados un aprobador */
  async findPerfilesByAprobador(loginAprob: string): Promise<number[]> {
    const rows = await this.db.query<any>(
      `SELECT DISTINCT p."U_IDPERFIL"
       FROM ${this.DB_U} u
       JOIN ${this.schema}."REND_PRM" p ON p."U_IDUSUARIO" = u."U_IdU"
       WHERE LOWER(u."U_NomSup") = LOWER(?)`,
      [loginAprob],
    );
    return rows.map(r => Number(this.db.col(r, 'U_IDPERFIL'))).filter(Boolean);
  }

  /** Cuenta cuántas rendiciones tiene pendientes un aprobador (nivel 1) */
  async countPendientes(loginAprob: string): Promise<number> {
    const rowsFormales = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt"
       FROM ${this.DB} a
       JOIN ${this.DB_M} m ON m."U_IdRendicion" = a."U_IdRendicion"
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE LOWER(a."U_LoginAprob") = LOWER(?)
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND a."U_Estado" = 'PENDIENTE'
         AND (
           a."U_Nivel" = 1
           OR NOT EXISTS (
             SELECT 1 FROM ${this.DB} prev
             WHERE prev."U_IdRendicion" = a."U_IdRendicion"
               AND prev."U_Nivel" = a."U_Nivel" - 1
               AND prev."U_Estado" != 'APROBADO'
           )
         )`,
      [loginAprob, loginAprob],
    );
    const cntFormales = Number(this.db.col(rowsFormales[0], 'cnt')) || 0;

    const rowsFallback = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt"
       FROM ${this.DB_M} m
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE m."U_Estado" = 4
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND NOT EXISTS (
           SELECT 1 FROM ${this.DB} a
           WHERE a."U_IdRendicion" = m."U_IdRendicion"
         )`,
      [loginAprob],
    );
    const cntFallback = Number(this.db.col(rowsFallback[0], 'cnt')) || 0;

    return cntFormales + cntFallback;
  }

  /** Cuenta cuántas rendiciones tiene pendientes de nivel 2 un aprobador */
  async countPendientesNivel2(loginAprob: string): Promise<number> {
    const rows = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt"
       FROM ${this.DB} a
       JOIN ${this.DB_M} m ON m."U_IdRendicion" = a."U_IdRendicion"
       JOIN ${this.DB_U} u ON CAST(u."U_IdU" AS VARCHAR) = m."U_IdUsuario"
       WHERE LOWER(a."U_LoginAprob") = LOWER(?)
         AND LOWER(u."U_NomSup") = LOWER(?)
         AND a."U_Estado" = 'PENDIENTE'
         AND a."U_Nivel" > 1
         AND EXISTS (
           SELECT 1 FROM ${this.DB} prev
           WHERE prev."U_IdRendicion" = a."U_IdRendicion"
             AND prev."U_Nivel" = a."U_Nivel" - 1
             AND prev."U_Estado" = 'APROBADO'
         )`,
      [loginAprob, loginAprob],
    );
    return Number(this.db.col(rows[0], 'cnt')) || 0;
  }

  /** Obtiene la cadena de aprobadores recorriendo U_NomSup */
  async resolverCadenaAprobadores(
    loginIniciador: string,
  ): Promise<{ login: string; nombre: string }[]> {
    const cadena: { login: string; nombre: string }[] = [];
    let loginActual = loginIniciador;
    const visitados = new Set<string>();

    for (;;) {
      if (visitados.has(loginActual)) break; // evitar ciclos
      visitados.add(loginActual);

      const rows = await this.db.query<any>(
        `SELECT "U_NomSup", "U_NomUser" FROM ${this.DB_U} WHERE LOWER("U_Login") = LOWER(?)`,
        [loginActual],
      );
      if (!rows.length) break;

      const nomSup  = this.db.col(rows[0], 'U_NomSup')  ?? '';

      if (!nomSup?.trim()) break; // sin aprobador → es el último nivel

      // Obtener nombre del superior
      const supRows = await this.db.query<any>(
        `SELECT "U_NomUser" FROM ${this.DB_U} WHERE LOWER("U_Login") = LOWER(?)`,
        [nomSup],
      );
      const supNombre = supRows.length ? (this.db.col(supRows[0], 'U_NomUser') ?? nomSup) : nomSup;

      cadena.push({ login: nomSup, nombre: supNombre });
      loginActual = nomSup;
    }

    return cadena;
  }
}