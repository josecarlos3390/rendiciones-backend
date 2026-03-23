import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
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
    const rows = await this.db.query<any>(
      `SELECT a."U_IdRendicion", a."U_Nivel", a."U_LoginAprob", a."U_NomAprob",
              a."U_Estado", a."U_FechaAprob", a."U_Comentario",
              m."U_IdUsuario", m."U_NomUsuario", m."U_NombrePerfil",
              m."U_Objetivo", m."U_FechaIni", m."U_FechaFinal",
              m."U_Monto", m."U_Estado" AS "U_Estado_Rend"
       FROM ${this.DB} a
       JOIN ${this.DB_M} m ON m."U_IdRendicion" = a."U_IdRendicion"
       WHERE a."U_LoginAprob" = ?
         AND a."U_Estado" = 'PENDIENTE'
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
      [loginAprob],
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

  /** Cuenta cuántas rendiciones tiene pendientes un aprobador */
  async countPendientes(loginAprob: string): Promise<number> {
    const rows = await this.db.query<any>(
      `SELECT COUNT(*) AS "cnt"
       FROM ${this.DB} a
       WHERE a."U_LoginAprob" = ?
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
      [loginAprob],
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

    while (true) {
      if (visitados.has(loginActual)) break; // evitar ciclos
      visitados.add(loginActual);

      const rows = await this.db.query<any>(
        `SELECT "U_NomSup", "U_NomUser" FROM ${this.DB_U} WHERE "U_Login" = ?`,
        [loginActual],
      );
      if (!rows.length) break;

      const nomSup  = this.db.col(rows[0], 'U_NomSup')  ?? '';
      const nomUser = this.db.col(rows[0], 'U_NomUser')  ?? '';

      if (!nomSup?.trim()) break; // sin aprobador → es el último nivel

      // Obtener nombre del superior
      const supRows = await this.db.query<any>(
        `SELECT "U_NomUser" FROM ${this.DB_U} WHERE "U_Login" = ?`,
        [nomSup],
      );
      const supNombre = supRows.length ? (this.db.col(supRows[0], 'U_NomUser') ?? nomSup) : nomSup;

      cadena.push({ login: nomSup, nombre: supNombre });
      loginActual = nomSup;
    }

    return cadena;
  }
}