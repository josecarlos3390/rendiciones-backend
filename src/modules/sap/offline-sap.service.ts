import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../database/interfaces/database.interface';
import { tbl } from '../../database/db-table.helper';
import { ConfigService } from '@nestjs/config';
import {
  DimensionWithRulesDto,
  ChartOfAccountDto,
  EmpleadoDto,
  CuentaDto,
  PerfilCuentaConfig,
} from './sap.service';

/**
 * Implementación OFFLINE de los mismos métodos que SapService.
 * En lugar de consultar SAP Service Layer, consulta las tablas
 * locales de Postgres:
 *
 *   getActiveDimensionsWithRules → REND_DIMENSIONES + REND_NORMAS
 *   getChartOfAccounts           → REND_COA
 *   getEmpleados                 → REND_PROV WHERE U_TIPO = 'EL'
 *   getProveedores               → REND_PROV WHERE U_TIPO IN ('PL','PE')
 *   getCuentasByPerfil           → REND_COA (filtrado por perfil)
 */
@Injectable()
export class OfflineSapService {
  private readonly logger = new Logger(OfflineSapService.name);

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly db: IDatabaseService,
    private readonly config: ConfigService,
  ) {}

  private get schema(): string {
    return this.config.get<string>('hana.schema');
  }
  private get dbType(): string {
    return this.config.get<string>('app.dbType', 'HANA').toUpperCase();
  }
  private get DB_PROV():      string { return tbl(this.schema, 'REND_PROV',        this.dbType); }
  private get DB_COA():       string { return tbl(this.schema, 'REND_COA',         this.dbType); }
  private get DB_DIM():       string { return tbl(this.schema, 'REND_DIMENSIONES', this.dbType); }
  private get DB_NR():        string { return tbl(this.schema, 'REND_NORMAS',      this.dbType); }
  private get DB_PROYECTOS(): string { return tbl(this.schema, 'REND_PROYECTOS',   this.dbType); }

  // ── Dimensiones y normas de reparto ─────────────────────────────────────────

  async getActiveDimensionsWithRules(): Promise<DimensionWithRulesDto[]> {
    const dims = await this.db.query<any>(
      `SELECT "DIM_CODE", "DIM_NAME", "DIM_DESCRIPCION"
       FROM ${this.DB_DIM}
       WHERE "DIM_ACTIVA" = 'Y'
       ORDER BY "DIM_CODE"`,
    );

    const normas = await this.db.query<any>(
      `SELECT "NR_FACTOR_CODE", "NR_DESCRIPCION", "NR_DIMENSION"
       FROM ${this.DB_NR}
       WHERE "NR_ACTIVA" = 'Y'`,
    );

    return dims.map(d => ({
      dimensionCode:        this.db.col(d, 'DIM_CODE'),
      dimensionName:        this.db.col(d, 'DIM_NAME'),
      dimensionDescription: this.db.col(d, 'DIM_DESCRIPCION') ?? '',
      rules: normas
        .filter(n => this.db.col(n, 'NR_DIMENSION') === this.db.col(d, 'DIM_CODE'))
        .map(n => ({
          factorCode:        this.db.col(n, 'NR_FACTOR_CODE'),
          factorDescription: this.db.col(n, 'NR_DESCRIPCION'),
        })),
    }));
  }

  clearCache(): void {
    // No hay caché en modo offline — no-op por compatibilidad con SapService
    this.logger.debug('clearCache() llamado en modo OFFLINE — ignorado');
  }

  // ── Plan de cuentas ──────────────────────────────────────────────────────────

  async getChartOfAccounts(): Promise<ChartOfAccountDto[]> {
    const rows = await this.db.query<any>(
      `SELECT "COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA"
       FROM ${this.DB_COA}
       WHERE "COA_ACTIVA" = 'Y'
       ORDER BY "COA_CODE"`,
    );

    return rows.map(r => ({
      code:       this.db.col(r, 'COA_CODE'),
      name:       this.db.col(r, 'COA_NAME'),
      formatCode: this.db.col(r, 'COA_FORMAT_CODE') ?? '',
      lockManual: this.db.col(r, 'COA_ASOCIADA') === 'Y' ? 'tYES' : 'tNO',
    }));
  }

  // ── Empleados ────────────────────────────────────────────────────────────────

  async getEmpleados(car: string, filtro: string): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? '').toUpperCase();
    if (carUpper === 'NOTIENE' || !filtro) return [];

    const rows = await this.db.query<any>(
      `SELECT "U_CODIGO", "U_RAZON_SOCIAL"
       FROM ${this.DB_PROV}
       WHERE "U_TIPO" = 'EL'
       ORDER BY "U_RAZON_SOCIAL"`,
    );

    // Aplicar filtro por prefijo de código (equivalente al CardCode filter de SAP)
    const filtroUpper = filtro.toUpperCase();
    const filtered = rows.filter(r => {
      const codigo: string = this.db.col(r, 'U_CODIGO') ?? '';
      return carUpper === 'TERMINA'
        ? codigo.toUpperCase().endsWith(filtroUpper)
        : codigo.toUpperCase().startsWith(filtroUpper);
    });

    return filtered.map(r => ({
      cardCode: this.db.col(r, 'U_CODIGO'),
      cardName: this.db.col(r, 'U_RAZON_SOCIAL'),
    }));
  }

  // ── Proveedores ──────────────────────────────────────────────────────────────

  async getProveedores(car: string, filtro: string, busqueda: string): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? 'TODOS').toUpperCase();

    let rows = await this.db.query<any>(
      `SELECT "U_CODIGO", "U_RAZON_SOCIAL"
       FROM ${this.DB_PROV}
       WHERE "U_TIPO" IN ('PL', 'PE')
       ORDER BY "U_RAZON_SOCIAL"`,
    );

    // Filtro por patrón de código (equivalente al CardCode filter de SAP)
    if (carUpper !== 'TODOS' && filtro) {
      const patrones = filtro.split('/').map(p => p.trim()).filter(Boolean);
      if (patrones.length > 0) {
        rows = rows.filter(r => {
          const codigo: string = (this.db.col(r, 'U_CODIGO') ?? '').toUpperCase();
          return patrones.some(p =>
            carUpper === 'TERMINA'
              ? codigo.endsWith(p.toUpperCase())
              : codigo.startsWith(p.toUpperCase()),
          );
        });
      }
    }

    // Filtro por búsqueda libre en nombre
    if (busqueda) {
      const q = busqueda.toLowerCase();
      rows = rows.filter(r =>
        (this.db.col(r, 'U_RAZON_SOCIAL') ?? '').toLowerCase().includes(q) ||
        (this.db.col(r, 'U_CODIGO')       ?? '').toLowerCase().includes(q),
      );
    }

    return rows.map(r => ({
      cardCode:   this.db.col(r, 'U_CODIGO'),
      cardName:   this.db.col(r, 'U_RAZON_SOCIAL'),
      licTradNum: this.db.col(r, 'U_NIT') || undefined,
    }));
  }

  async getProveedoresAll(car: string, filtro: string): Promise<EmpleadoDto[]> {
    return this.getProveedores(car, filtro, '');
  }

  async getProveedoresPaginado(car: string, filtro: string): Promise<EmpleadoDto[]> {
    // En modo OFFLINE no necesitamos paginación, usamos el método existente
    return this.getProveedores(car, filtro, '');
  }

  async getEmpleadosPaginado(car: string, filtro: string): Promise<EmpleadoDto[]> {
    // En modo OFFLINE no necesitamos paginación, usamos el método existente
    return this.getEmpleados(car, filtro);
  }

  async getCuentasPaginado(
    config: PerfilCuentaConfig,
    _listaCuentas: CuentaDto[] = [],
  ): Promise<CuentaDto[]> {
    // En modo OFFLINE no necesitamos paginación
    // Llamamos a getCuentasByPerfil sin búsqueda para obtener todas las cuentas filtradas
    return this.getCuentasByPerfil(config, '', []);
  }

  // ── Cuentas filtradas por perfil ─────────────────────────────────────────────

  async getCuentasByPerfil(
    config:       PerfilCuentaConfig,
    busqueda:     string,
    listaCuentas: CuentaDto[] = [],
  ): Promise<CuentaDto[]> {
    const car = (config.cueCar ?? 'TODOS').toUpperCase();

    // LISTA: filtrar sobre las cuentas ya cargadas (igual que SapService)
    if (car === 'LISTA') {
      const q = busqueda.toLowerCase();
      return listaCuentas.filter(c =>
        !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      );
    }

    // Cargar todas las cuentas activas
    let rows = await this.db.query<any>(
      `SELECT "COA_CODE", "COA_NAME"
       FROM ${this.DB_COA}
       WHERE "COA_ACTIVA" = 'Y'
       ORDER BY "COA_CODE"`,
    );

    // Filtro por patrón de código según U_CUE_CAR del perfil
    if (car !== 'TODOS' && config.cueTexto) {
      const patrones = config.cueTexto
        .split('/')
        .map(p => p.trim())
        .filter(Boolean);

      if (patrones.length > 0) {
        rows = rows.filter(r => {
          const code: string = (this.db.col(r, 'COA_CODE') ?? '').toUpperCase();
          if (car === 'RANGO' && patrones.length >= 2) {
            for (let i = 0; i < patrones.length - 1; i += 2) {
              if (code.startsWith(patrones[i].toUpperCase()) &&
                  code.endsWith(patrones[i + 1].toUpperCase())) return true;
            }
            return false;
          }
          return patrones.some(p =>
            car === 'TERMINA'
              ? code.endsWith(p.toUpperCase())
              : code.startsWith(p.toUpperCase()),
          );
        });
      }
    }

    // Filtro por búsqueda libre
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const esNumerico = /^[\d.]+$/.test(busqueda);
      rows = rows.filter(r => {
        const code = (this.db.col(r, 'COA_CODE') ?? '').toLowerCase();
        const name = (this.db.col(r, 'COA_NAME') ?? '').toLowerCase();
        return esNumerico ? code.startsWith(q) : name.includes(q);
      });
    }

    return rows.map(r => ({
      code: this.db.col(r, 'COA_CODE'),
      name: this.db.col(r, 'COA_NAME'),
    }));
  }

  /**
   * Proyectos activos desde tabla local REND_PROYECTOS.
   * En modo OFFLINE se asume que hay una tabla sincronizada.
   */
  async getProjects(): Promise<{ code: string; name: string }[]> {
    // Si no existe tabla de proyectos, retornar lista vacía
    try {
      const rows = await this.db.query<any>(
        `SELECT "PROY_CODE", "PROY_NAME" FROM ${this.DB_PROYECTOS} WHERE "PROY_ACTIVO" = 'Y' ORDER BY "PROY_CODE"`,
      );
      return rows.map(r => ({
        code: this.db.col(r, 'PROY_CODE'),
        name: this.db.col(r, 'PROY_NAME'),
      }));
    } catch {
      // Si la tabla no existe o hay error, retornar vacío
      return [];
    }
  }
}