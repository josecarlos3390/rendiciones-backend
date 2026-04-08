import { Injectable, Logger, InternalServerErrorException, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDatabaseService, DATABASE_SERVICE } from '../../database/interfaces/database.interface';
import * as https from 'https';

// ── Interfaces Service Layer ──────────────────────────────────────────────────

/** Cuenta del plan contable simplificada para el selector */
export interface CuentaDto {
  code: string;
  name: string;
}

/** Perfil mínimo necesario para resolver el filtro de cuentas */
export interface PerfilCuentaConfig {
  cueCar:   string;        // U_CUE_CAR:   EMPIEZA | TERMINA | TODOS | RANGO | LISTA
  cueTexto: string | null; // U_CUE_Texto: /1/2/5/6/8
}

interface SLDimension {
  DimensionCode:        number;
  DimensionName:        string;
  IsActive:             string;
  DimensionDescription: string;
}

interface SLDistributionRule {
  FactorCode:        string;
  FactorDescription: string;
  InWhichDimension:  number;
  Active:            string;
}

export interface DistributionRuleDto {
  factorCode:        string;
  factorDescription: string;
}

export interface DimensionWithRulesDto {
  dimensionCode:        number;
  dimensionName:        string;
  dimensionDescription: string;
  rules:                DistributionRuleDto[];
}


// ── Chart of Accounts ─────────────────────────────────────────────────────────

export interface ChartOfAccountDto {
  code:       string;   // Code → U_CuentaSys
  name:       string;   // Name → U_CuentaNombre
  formatCode: string;   // FormatCode → U_CuentaFormatCode
  lockManual: string;   // LockManualTransaction → U_CuentaAsociada ('tYES'/'tNO')
}

interface SLAccount {
  Code:                  string;
  Name:                  string;
  FormatCode:            string;
  ActiveAccount:         string;
  AccountLevel:          number;
  FrozenFor:             string;
  LockManualTransaction: string;
}

// ── Business Partners / Empleados ────────────────────────────────────────────

interface SLBusinessPartner {
  CardCode: string;
  CardName: string;
  FederalTaxID?: string;
}

export interface EmpleadoDto {
  cardCode: string;
  cardName: string;
  licTradNum?: string;
}

interface SLSession {
  cookie:    string;
  expiresAt: number;
}

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

@Injectable()
export class SapService {
  private readonly logger = new Logger(SapService.name);

  private readonly SESSION_TTL_MS = 25 * 60 * 1000;
  private readonly CACHE_TTL_MS   = 10 * 60 * 1000;

  private session:    SLSession | null = null;
  private sessionLock: Promise<string> | null = null;
  private dimCache:   CacheEntry<DimensionWithRulesDto[]> | null = null;
  private rulesCache: CacheEntry<SLDistributionRule[]>    | null = null;
  private coaCache:   CacheEntry<ChartOfAccountDto[]>      | null = null;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
  ) {}

  private get dbType(): string { return (this.config.get<string>('app.dbType') ?? 'HANA').toUpperCase(); }

  private get slBaseUrl(): string {
    return (this.config.get<string>('SAP_SL_URL') ?? '').replace(/\/$/, '');
  }
  private get slUser(): string     { return this.config.get<string>('SAP_SL_USER')     ?? ''; }
  private get slPassword(): string { return this.config.get<string>('SAP_SL_PASSWORD') ?? ''; }
  private get slCompanyDB(): string{ return this.config.get<string>('SAP_SL_COMPANY')  ?? ''; }

  // ── Método principal ──────────────────────────────────────────────────────

  async getActiveDimensionsWithRules(): Promise<DimensionWithRulesDto[]> {
    if (this.dimCache && Date.now() < this.dimCache.expiresAt) {
      this.logger.debug('Dimensiones desde caché');
      return this.dimCache.data;
    }

    try {
      const [dimensions, allRules] = await Promise.all([
        this.fetchDimensions(),
        this.fetchDistributionRules(),
      ]);

      const activeDimensions = dimensions.filter(d => d.IsActive === 'tYES');

      const result: DimensionWithRulesDto[] = activeDimensions.map(dim => ({
        dimensionCode:        dim.DimensionCode,
        dimensionName:        dim.DimensionName,
        dimensionDescription: dim.DimensionDescription,
        rules: allRules
          .filter(r => r.InWhichDimension === dim.DimensionCode && r.Active === 'tYES')
          .map(r => ({ factorCode: r.FactorCode, factorDescription: r.FactorDescription })),
      }));

      this.dimCache = { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS };
      this.logger.log(`Dimensiones cargadas: ${result.length} activas`);
      return result;

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP Service Layer: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  clearCache() {
    this.dimCache = this.rulesCache = this.coaCache = null;
    this.session  = null;
    this.logger.log('Caché y sesión SAP SL limpiadas');
  }


  // ── Chart of Accounts ────────────────────────────────────────────────────

  /**
   * Devuelve cuentas del plan contable filtradas:
   * ActiveAccount = tYES, FrozenFor = tNO, AccountLevel = 5
   * Paginamos en loop para traer todo (SAP SL devuelve máx 20 por defecto)
   */
  async getChartOfAccounts(): Promise<ChartOfAccountDto[]> {
    // En modo Postgres/Offline usar REND_COA en lugar de SAP SL
    if (this.dbType === 'POSTGRES' && this.db) {
      const schema = this.config.get<string>('hana.schema') ?? 'rend_retail';
      const rows = await this.db.query<any>(
        `SELECT "COA_CODE", "COA_NAME", "COA_FORMAT_CODE", "COA_ASOCIADA"
         FROM "${schema}"."REND_COA"
         WHERE "COA_ACTIVA" = 'Y'
         ORDER BY "COA_FORMAT_CODE"`,
      );
      return rows.map((r: any) => ({
        code:       r.COA_CODE       ?? r.coa_code,
        name:       r.COA_NAME       ?? r.coa_name,
        formatCode: r.COA_FORMAT_CODE ?? r.coa_format_code ?? r.COA_CODE ?? r.coa_code,
        lockManual: (r.COA_ASOCIADA ?? r.coa_asociada) === 'Y' ? 'tYES' : 'tNO',
      }));
    }

    if (this.coaCache && Date.now() < this.coaCache.expiresAt) {
      this.logger.debug('ChartOfAccounts desde caché');
      return this.coaCache.data;
    }

    try {
      const fields = 'Code,Name,FormatCode,ActiveAccount,AccountLevel,FrozenFor,LockManualTransaction';
      const filter = "ActiveAccount eq 'tYES' and FrozenFor eq 'tNO' and AccountLevel eq 5";
      const endpoint = `ChartOfAccounts?$select=${fields}&$filter=${encodeURIComponent(filter)}&$top=5000`;

      const data = await this.slGet<{ value: SLAccount[] }>(endpoint);
      const accounts = (data.value ?? []).map(a => ({
        code:       a.Code,
        name:       a.Name,
        formatCode: a.FormatCode,
        lockManual: a.LockManualTransaction,
      }));

      this.coaCache = { data: accounts, expiresAt: Date.now() + this.CACHE_TTL_MS };
      this.logger.log(`ChartOfAccounts cargado: ${accounts.length} cuentas activas nivel 5`);
      return accounts;

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error ChartOfAccounts SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP Service Layer ChartOfAccounts: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  // ── Empleados (BusinessPartners filtrados por perfil) ─────────────────────

  /**
   * Retorna empleados desde SAP SL según la característica configurada en el perfil.
   *
   * @param car    - Característica del perfil (U_EMP_CAR): 'EMPIEZA' | 'TERMINA' | 'NOTIENE'
   * @param filtro - Texto del perfil (U_EMP_TEXTO), p.ej. 'EL'
   *
   * Lógica:
   *  - NOTIENE  → retorna [] sin consultar SAP
   *  - EMPIEZA  → OData startswith(CardCode, 'XX')
   *  - TERMINA  → OData endswith(CardCode, 'XX')  (soportado en SAP SL según doc oficial)
   *
   * NOTA: CardType 'cEmployee' no existe en BoCardTypes de SAP SL.
   * Los empleados se identifican únicamente por el prefijo/sufijo de CardCode
   * configurado en el perfil (U_EMP_TEXTO).
   */
  async getEmpleados(car: string, filtro: string): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? '').toUpperCase();

    // NOTIENE o sin filtro → lista vacía, sin consultar SAP
    if (carUpper === 'NOTIENE' || !filtro) return [];

    try {
      const cardCodeFilter = carUpper === 'TERMINA'
        ? `endswith(CardCode, '${filtro}')`
        : `startswith(CardCode, '${filtro}')`;

      const endpoint = `BusinessPartners?$select=CardCode,CardName&$filter=${encodeURIComponent(cardCodeFilter)}&$top=500`;
      const data     = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
      return (data.value ?? []).map(bp => ({
        cardCode: bp.CardCode,
        cardName: bp.CardName,
        licTradNum: bp.FederalTaxID,
      }));

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error getEmpleados SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP BusinessPartners empleados: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  /**
   * Trae TODOS los empleados del perfil desde SAP SL paginando de 500 en 500.
   * Luego los devuelve al frontend para filtrado local.
   */
  async getEmpleadosPaginado(
    car: string,
    filtro: string,
  ): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? 'EMPIEZA').toUpperCase();
    const pageSize = 500;

    // NOTIENE o sin filtro → lista vacía
    if (carUpper === 'NOTIENE' || !filtro) return [];

    // Construir filtro base por perfil
    const cardCodeFilter = carUpper === 'TERMINA'
      ? `endswith(CardCode, '${filtro}')`
      : `startswith(CardCode, '${filtro}')`;

    const buildEndpoint = (skip: number) => {
      return `BusinessPartners?$select=CardCode,CardName&$filter=${encodeURIComponent(cardCodeFilter)}&$orderby=CardName&$top=${pageSize}&$skip=${skip}`;
    };

    const all: EmpleadoDto[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let pageCount = 0;
    const maxPages = 20; // límite de seguridad: 20 x 500 = 10.000 registros

    while (pageCount < maxPages) {
      const endpoint = buildEndpoint(offset);
      this.logger.debug(`getEmpleadosPaginado query: ${decodeURIComponent(endpoint)}`);

      let data: { value?: SLBusinessPartner[] };
      try {
        data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
      } catch (err: any) {
        this.logger.warn(`getEmpleadosPaginado falló en página offset=${offset}: ${err?.message}`);
        this.session = null;
        // Reintentar una vez con sesión nueva
        try {
          data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
        } catch (err2: any) {
          this.logger.error(`getEmpleadosPaginado reintentó y falló: ${err2?.message}`);
          break;
        }
      }

      const page = (data.value ?? []) as SLBusinessPartner[];
      if (page.length === 0) break;

      for (const bp of page) {
        const key = bp.CardCode;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({
            cardCode: bp.CardCode,
            cardName: bp.CardName,
            licTradNum: bp.FederalTaxID,
          });
        }
      }

      pageCount++;
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    this.logger.log(`getEmpleadosPaginado completado: ${all.length} empleados cargados en ${pageCount} páginas`);
    return all;
  }

  // ── Proveedores (BusinessPartners filtrados por perfil) ──────────────────────

  /**
   * Retorna proveedores desde SAP SL según la configuración del perfil.
   *
   * U_PRO_CAR define el tipo de filtro:
   *   TODOS   → busca solo por nombre (sin filtro de CardCode)
   *   EMPIEZA → startswith(CardCode, patrón)
   *   TERMINA → endswith(CardCode, patrón)
   *
   * @param car     U_PRO_CAR del perfil
   * @param filtro  U_PRO_Texto del perfil (patrón de CardCode)
   * @param busqueda texto libre del usuario (busca en CardName)
   */
  async getProveedores(car: string, filtro: string, busqueda: string): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? 'TODOS').toUpperCase();

    const buildFilters = (includeNitInOdata: boolean): string[] => {
      const filters: string[] = [];

      // 1. Filtro por patrón de CardCode según configuración del perfil
      if (carUpper !== 'TODOS' && filtro) {
        const patrones = filtro.split('/').map(p => p.trim()).filter(Boolean);
        if (patrones.length > 0) {
          const conds = patrones.map(p =>
            carUpper === 'TERMINA'
              ? `endswith(CardCode, '${p}')`
              : `startswith(CardCode, '${p}')`,
          );
          filters.push(`(${conds.join(' or ')})`);
        }
      }

      // 2. Filtro por búsqueda libre (nombre/código/NIT)
      if (busqueda) {
        const q = busqueda.replace(/'/g, "''");
        const esCodigoNumerico = /^[\w\d]+$/.test(q) && !/[a-zA-Z]/.test(q);
        if (includeNitInOdata) {
          if (esCodigoNumerico) {
            filters.push(`(startswith(CardCode, '${q}') or contains(FederalTaxID, '${q}'))`);
          } else {
            filters.push(`(contains(CardName, '${q}') or contains(FederalTaxID, '${q}'))`);
          }
        } else {
          if (esCodigoNumerico) {
            filters.push(`startswith(CardCode, '${q}')`);
          } else {
            filters.push(`contains(CardName, '${q}')`);
          }
        }
      }

      return filters;
    };

    const buildEndpoint = (filters: string[]) => {
      const combined = filters.join(' and ');
      return `BusinessPartners?$select=CardCode,CardName,FederalTaxID&${combined ? `$filter=${encodeURIComponent(combined)}&` : ''}$orderby=CardName&$top=500`;
    };

    const mapResult = (data: { value?: SLBusinessPartner[] }) =>
      (data.value ?? []).map(bp => ({
        cardCode: bp.CardCode,
        cardName: bp.CardName,
        licTradNum: bp.FederalTaxID,
      }));

    // Intento 1: query completa con filtro de NIT en OData
    try {
      const filters = buildFilters(true);
      const endpoint = buildEndpoint(filters);
      this.logger.debug(`getProveedores query: ${decodeURIComponent(endpoint)}`);
      const data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
      return mapResult(data);
    } catch (err: any) {
      this.logger.warn(`getProveedores con filtro NIT falló: ${err?.message}. Fallback sin filtro NIT...`);
      this.session = null;
    }

    // Intento 2: fallback sin filtro de NIT en OData, filtramos en memoria
    try {
      const filters = buildFilters(false);
      const endpoint = buildEndpoint(filters);
      this.logger.debug(`getProveedores fallback query: ${decodeURIComponent(endpoint)}`);
      const data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
      let result = mapResult(data);

      if (busqueda) {
        const q = busqueda.toLowerCase().trim();
        result = result.filter(bp =>
          bp.cardCode.toLowerCase().includes(q) ||
          bp.cardName.toLowerCase().includes(q) ||
          (bp.licTradNum && bp.licTradNum.toLowerCase().includes(q)),
        );
      }

      return result;
    } catch (err2: any) {
      this.session = null;
      this.logger.error('Error getProveedores SAP SL:', err2?.message ?? err2);
      throw new InternalServerErrorException(
        `SAP BusinessPartners proveedores: ${err2?.message ?? 'Error desconocido'}`,
      );
    }
  }

  /**
   * Trae TODOS los proveedores del perfil desde SAP SL paginando de 500 en 500.
   * Luego los devuelve al frontend para filtrado local.
   */
  async getProveedoresPaginado(
    car: string,
    filtro: string,
  ): Promise<EmpleadoDto[]> {
    const carUpper = (car ?? 'TODOS').toUpperCase();
    const pageSize = 500;

    // Construir filtro base por perfil
    const filters: string[] = [];
    if (carUpper !== 'TODOS' && filtro) {
      const patrones = filtro.split('/').map(p => p.trim()).filter(Boolean);
      if (patrones.length > 0) {
        const conds = patrones.map(p =>
          carUpper === 'TERMINA'
            ? `endswith(CardCode, '${p}')`
            : `startswith(CardCode, '${p}')`,
        );
        filters.push(`(${conds.join(' or ')})`);
      }
    }

    // Si no hay filtro de perfil ni de búsqueda, SAP SL a veces exige un filtro mínimo.
    // Usamos un filtro que siempre sea verdadero para el patrón vacío si es necesario,
    // pero en la práctica TODOS sin filtro puede devolver muchos registros.
    // Dejamos que el endpoint funcione con o sin filtros.
    const baseFilter = filters.length ? filters.join(' and ') : '';

    const buildEndpoint = (skip: number) => {
      const filterPart = baseFilter ? `$filter=${encodeURIComponent(baseFilter)}&` : '';
      return `BusinessPartners?$select=CardCode,CardName,FederalTaxID&${filterPart}$orderby=CardName&$top=${pageSize}&$skip=${skip}`;
    };

    const all: EmpleadoDto[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let pageCount = 0;
    const maxPages = 20; // límite de seguridad: 20 x 500 = 10.000 registros

    while (pageCount < maxPages) {
      const endpoint = buildEndpoint(offset);
      this.logger.debug(`getProveedoresPaginado query: ${decodeURIComponent(endpoint)}`);

      let data: { value?: SLBusinessPartner[] };
      try {
        data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
      } catch (err: any) {
        this.logger.warn(`getProveedoresPaginado falló en página offset=${offset}: ${err?.message}`);
        this.session = null;
        // Reintentar una vez con sesión nueva
        try {
          data = await this.slGet<{ value: SLBusinessPartner[] }>(endpoint);
        } catch (err2: any) {
          this.logger.error(`getProveedoresPaginado reintentó y falló: ${err2?.message}`);
          break;
        }
      }

      const page = (data.value ?? []) as SLBusinessPartner[];
      if (page.length === 0) break;

      for (const bp of page) {
        const key = bp.CardCode;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({
            cardCode: bp.CardCode,
            cardName: bp.CardName,
            licTradNum: bp.FederalTaxID,
          });
        }
      }

      pageCount++;
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    this.logger.log(`getProveedoresPaginado completado: ${all.length} proveedores cargados en ${pageCount} páginas`);
    return all;
  }

  // ── Cuentas por perfil ───────────────────────────────────────────────────────

  /**
   * Devuelve cuentas del plan contable filtradas según la configuración del perfil.
   *
   * U_CUE_CAR define el tipo de filtro:
   *   TODOS   → todas las cuentas nivel 5 activas
   *   EMPIEZA → Code startswith cada patrón de U_CUE_Texto (/1/2/5)
   *   TERMINA → Code endswith cada patrón
   *   RANGO   → Code contains cada patrón (substringof)
   *   LISTA   → las cuentas ya están en REND_CTA_M, se pasan como listaCuentas
   *
   * Para EMPIEZA/TERMINA/RANGO/TODOS consulta SAP SL.
   * Para LISTA el llamador pasa las cuentas directamente (ya las tiene el frontend).
   *
   * @param config     configuración del perfil (cueCar + cueTexto)
   * @param busqueda   término de búsqueda libre (filtra por Code o Name)
   * @param listaCuentas cuentas pre-cargadas (solo para cueCar === 'LISTA')
   */
  async getCuentasByPerfil(
    config:       PerfilCuentaConfig,
    busqueda:     string,
    listaCuentas: CuentaDto[] = [],
  ): Promise<CuentaDto[]> {
    const car = (config.cueCar ?? 'TODOS').toUpperCase();

    // ── LISTA: filtrar sobre las cuentas ya cargadas ─────────────────────────
    if (car === 'LISTA') {
      const q = busqueda.toLowerCase();
      return listaCuentas.filter(c =>
        c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      );
    }

    // ── SAP SL: construir filtro OData ───────────────────────────────────────
    try {
      const baseFilter = "ActiveAccount eq 'tYES' and FrozenFor eq 'tNO' and AccountLevel ge 5";
      let   carFilter  = '';

      if (car === 'TODOS') {
        carFilter = '';
      } else {
        // Parsear el patrón: /1/2/5/6/8 → ['1','2','5','6','8']
        const patrones = this.parsearPatrones(config.cueTexto ?? '');
        if (patrones.length === 0) {
          carFilter = '';
        } else {
          const condiciones = patrones.map(p => {
            if (car === 'EMPIEZA') return `startswith(Code, '${p}')`;
            if (car === 'TERMINA') return `endswith(Code, '${p}')`;
            // RANGO: el patrón tiene formato "inicio|fin" o se toman pares del cueTexto
            // El cueTexto para RANGO es "/inicio/fin" — primer valor empieza, segundo termina
            // Se genera: startswith(Code,'inicio') and endswith(Code,'fin')
            return `startswith(Code, '${p}')`;
          });

          if (car === 'RANGO' && patrones.length >= 2) {
            // Pares: patrones[0]=inicio, patrones[1]=fin
            // Si hay más patrones se toman como pares: [0,1], [2,3], etc.
            const pares: string[] = [];
            for (let i = 0; i < patrones.length - 1; i += 2) {
              pares.push(`(startswith(Code, '${patrones[i]}') and endswith(Code, '${patrones[i + 1]}'))`);
            }
            carFilter = pares.join(' or ');
          } else {
            carFilter = condiciones.join(' or ');
          }
        }
      }

      // ── Filtro de búsqueda libre ─────────────────────────────────────────────
      // SAP SL v1 (OData v2) soporta: startswith, endswith, substringof
      // NO soporta contains() — usar substringof('valor', campo)
      let searchFilter = '';
      if (busqueda) {
        const q = busqueda.replace(/'/g, "''");
        // Si la búsqueda parece un código (solo dígitos y puntos) → startswith(Code)
        // Si parece un nombre (tiene letras) → contains(Name)
        // Así coincide exactamente con el formato que acepta SAP SL
        const esCodigoNumerico = /^[\d.]+$/.test(q);
        searchFilter = esCodigoNumerico
          ? `startswith(Code, '${q}')`
          : `contains(Name, '${q}')`;
      }

      // ── Combinar ─────────────────────────────────────────────────────────────
      let combined = baseFilter;
      if (carFilter)    combined += ` and (${carFilter})`;
      if (searchFilter) combined += ` and ${searchFilter}`;

      const fields   = 'Code,Name';
      const endpoint = `ChartOfAccounts?$select=${fields}&$filter=${encodeURIComponent(combined)}&$orderby=Code&$top=200`;

      this.logger.debug(`getCuentasByPerfil query: ${decodeURIComponent(endpoint)}`);

      const data = await this.slGet<{ value: SLAccount[] }>(endpoint);
      return (data.value ?? []).map(a => ({ code: a.Code, name: a.Name }));

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error getCuentasByPerfil SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP ChartOfAccounts filtrado: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  /**
   * Trae TODAS las cuentas del plan contable filtradas por perfil,
   * paginando desde SAP SL de 500 en 500.
   * Luego las devuelve al frontend para filtrado local.
   *
   * @param config  configuración del perfil (cueCar + cueTexto)
   * @param listaCuentas  cuentas pre-cargadas (solo para cueCar === 'LISTA')
   */
  async getCuentasPaginado(
    config: PerfilCuentaConfig,
    listaCuentas: CuentaDto[] = [],
  ): Promise<CuentaDto[]> {
    const car = (config.cueCar ?? 'TODOS').toUpperCase();

    // ── LISTA: devolver las cuentas ya proporcionadas ─────────────────────────
    if (car === 'LISTA') {
      return listaCuentas;
    }

    // ── SAP SL: construir filtro base y paginar ──────────────────────────────
    const pageSize = 500;

    // Filtro base: cuentas activas, no congeladas, nivel >= 5
    const baseFilters: string[] = [
      "ActiveAccount eq 'tYES'",
      "FrozenFor eq 'tNO'",
      "AccountLevel ge 5",
    ];

    // Filtro por perfil (cueCar + cueTexto)
    if (car !== 'TODOS' && config.cueTexto) {
      const patrones = this.parsearPatrones(config.cueTexto);
      if (patrones.length > 0) {
        if (car === 'RANGO' && patrones.length >= 2) {
          // Pares: [0]=inicio, [1]=fin, [2]=inicio2, [3]=fin2, etc.
          const pares: string[] = [];
          for (let i = 0; i < patrones.length - 1; i += 2) {
            pares.push(`(startswith(Code, '${patrones[i]}') and endswith(Code, '${patrones[i + 1]}'))`);
          }
          if (pares.length) baseFilters.push(`(${pares.join(' or ')})`);
        } else {
          const conds = patrones.map(p => {
            if (car === 'TERMINA') return `endswith(Code, '${p}')`;
            return `startswith(Code, '${p}')`;
          });
          baseFilters.push(`(${conds.join(' or ')})`);
        }
      }
    }

    const baseFilter = baseFilters.join(' and ');

    const buildEndpoint = (skip: number) => {
      const fields = 'Code,Name';
      return `ChartOfAccounts?$select=${fields}&$filter=${encodeURIComponent(baseFilter)}&$orderby=Code&$top=${pageSize}&$skip=${skip}`;
    };

    const all: CuentaDto[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let pageCount = 0;
    const maxPages = 20; // límite de seguridad: 20 x 500 = 10.000 registros

    while (pageCount < maxPages) {
      const endpoint = buildEndpoint(offset);
      this.logger.debug(`getCuentasPaginado query: ${decodeURIComponent(endpoint)}`);

      let data: { value?: SLAccount[] };
      try {
        data = await this.slGet<{ value: SLAccount[] }>(endpoint);
      } catch (err: any) {
        this.logger.warn(`getCuentasPaginado falló en página offset=${offset}: ${err?.message}`);
        this.session = null;
        // Reintentar una vez con sesión nueva
        try {
          data = await this.slGet<{ value: SLAccount[] }>(endpoint);
        } catch (err2: any) {
          this.logger.error(`getCuentasPaginado reintentó y falló: ${err2?.message}`);
          break;
        }
      }

      const page = (data.value ?? []) as SLAccount[];
      if (page.length === 0) break;

      for (const acc of page) {
        const key = acc.Code;
        if (!seen.has(key)) {
          seen.add(key);
          all.push({ code: acc.Code, name: acc.Name });
        }
      }

      pageCount++;
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    this.logger.log(`getCuentasPaginado completado: ${all.length} cuentas cargadas en ${pageCount} páginas`);
    return all;
  }

  /**
   * Parsea el patrón de cuentas del perfil.
   * "/1/2/5/6/8" → ["1","2","5","6","8"]
   */
  private parsearPatrones(texto: string): string[] {
    return texto
      .split('/')
      .map(p => p.trim())
      .filter(Boolean);
  }

  // ── Proyectos ───────────────────────────────────────────────────────────────

  /**
   * Retorna proyectos activos desde SAP SL.
   * Filtra por Active = 'tYES' y ordena por nombre.
   */
  async getProjects(): Promise<{ code: string; name: string }[]> {
    try {
      const endpoint = `Projects?$select=Code,Name&$filter=Active eq 'tYES'&$orderby=Name`;
      this.logger.debug(`getProjects query: ${endpoint}`);

      const data = await this.slGet<{ value: Array<{ Code: string; Name: string }> }>(endpoint);
      
      return (data.value ?? []).map(p => ({
        code: p.Code,
        name: p.Name,
      }));

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error getProjects SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP Projects: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  // ── Sesión: POST /Login → B1SESSION cookie ────────────────────────────────

  private async getSession(): Promise<string> {
    if (this.session && Date.now() < this.session.expiresAt) {
      return this.session.cookie;
    }

    if (this.sessionLock != null) {
      return this.sessionLock;
    }

    this.sessionLock = this.doLogin();
    const cookie = await this.sessionLock;
    this.sessionLock = null;

    this.session = { cookie, expiresAt: Date.now() + this.SESSION_TTL_MS };
    this.logger.log('Sesión SAP SL establecida');
    return cookie;
  }

  private async doLogin(): Promise<string> {
    this.logger.log('Iniciando sesión SAP SL...');

    const body = JSON.stringify({
      CompanyDB: this.slCompanyDB,
      UserName:  this.slUser,
      Password:  this.slPassword,
    });

    const cookie = await new Promise<string>((resolve, reject) => {
      const parsedUrl = new URL(`${this.slBaseUrl}/Login`);
      const options: https.RequestOptions = {
        hostname:           parsedUrl.hostname,
        port:               parseInt(parsedUrl.port) || 443,
        path:               parsedUrl.pathname,
        method:             'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let rb = '';
        res.on('data', c => rb += c);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`Login SAP SL falló ${res.statusCode}: ${rb}`));
          }
          const setCookie = res.headers['set-cookie'] ?? [];
          const b1 = setCookie.map(c => c.split(';')[0]).find(c => c.startsWith('B1SESSION='));
          if (!b1) {
            return reject(new Error(`Login OK pero sin cookie B1SESSION. Body: ${rb}`));
          }
          resolve(b1);
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout en Login SAP SL')); });
      req.write(body);
      req.end();
    });

    return cookie;
  }

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  private async fetchDimensions(): Promise<SLDimension[]> {
    const data = await this.slGet<{ value: SLDimension[] }>('Dimensions');
    return data.value ?? [];
  }

  private async fetchDistributionRules(): Promise<SLDistributionRule[]> {
    if (this.rulesCache && Date.now() < this.rulesCache.expiresAt) {
      return this.rulesCache.data;
    }
    const data = await this.slGet<{ value: SLDistributionRule[] }>(
      'DistributionRules?$select=FactorCode,FactorDescription,InWhichDimension,Active&$top=5000',
    );
    const rules = data.value ?? [];
    this.rulesCache = { data: rules, expiresAt: Date.now() + this.CACHE_TTL_MS };
    return rules;
  }

  // ── Tipo de Cambio (Exchange Rates) ────────────────────────────────────────

  /**
   * Obtiene el tipo de cambio de una moneda para una fecha específica desde SAP.
   * Usa el servicio SBOBobService_GetCurrencyRate de SAP Service Layer.
   * 
   * POST /b1s/v1/SBOBobService_GetCurrencyRate
   * Body: { "Currency": "USD", "Date": "20260101" }
   * 
   * @param fecha Fecha en formato YYYY-MM-DD
   * @param moneda Código de moneda (ej: 'USD')
   * @returns Tasa de cambio (rate) o null si no existe
   */
  async getTipoCambio(fecha: string, moneda: string = 'USD'): Promise<number | null> {
    try {
      // Formatear fecha para SAP: YYYY-MM-DD -> YYYYMMDD (formato interno de SAP)
      const fechaSap = fecha.replace(/-/g, '');
      
      // Usar SBOBobService_GetCurrencyRate para obtener el tipo de cambio
      const body = {
        Currency: moneda.toUpperCase(),
        Date: fechaSap,
      };

      const data = await this.slPost<{ Rate: number }>('SBOBobService_GetCurrencyRate', body);

      if (!data || data.Rate === undefined || data.Rate === null) {
        this.logger.warn(`No se encontró tipo de cambio para ${moneda} en fecha ${fecha}`);
        return null;
      }

      // SAP devuelve la tasa: cuántos BOB = 1 unidad de moneda extranjera
      // Ejemplo: Rate = 6.96 significa 1 USD = 6.96 BOB
      this.logger.debug(`Tipo de cambio ${moneda} para ${fecha}: ${data.Rate}`);
      return data.Rate;

    } catch (error) {
      this.logger.error(`Error al obtener tipo de cambio desde SAP: ${error.message}`);
      return null;
    }
  }

  // ── GET con cookie de sesión ──────────────────────────────────────────────

  private async slGet<T>(endpoint: string): Promise<T> {
    if (!this.slBaseUrl) throw new Error('SAP_SL_URL no configurado en .env');

    const sessionCookie = await this.getSession();
    const url           = `${this.slBaseUrl}/${endpoint}`;

    return new Promise<T>((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options: https.RequestOptions = {
        hostname:           parsedUrl.hostname,
        port:               parseInt(parsedUrl.port) || 443,
        path:               parsedUrl.pathname + parsedUrl.search,
        method:             'GET',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          'Cookie':       sessionCookie,
          'Prefer':       'odata.maxpagesize=5000',
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            this.session = null;
            return reject(new Error(`Sesión expirada o sin permisos (${res.statusCode})`));
          }
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`SAP SL ${endpoint} → ${res.statusCode}: ${body}`));
          }
          try   { resolve(JSON.parse(body) as T); }
          catch { reject(new Error(`Error parseando respuesta SAP SL: ${body.substring(0, 300)}`)); }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout GET ${endpoint}`)); });
      req.end();
    });
  }

  // ── POST con cookie de sesión ──────────────────────────────────────────────

  private async slPost<T>(endpoint: string, body: object): Promise<T> {
    if (!this.slBaseUrl) throw new Error('SAP_SL_URL no configurado en .env');

    const sessionCookie = await this.getSession();
    const url           = `${this.slBaseUrl}/${endpoint}`;
    const bodyJson      = JSON.stringify(body);

    return new Promise<T>((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options: https.RequestOptions = {
        hostname:           parsedUrl.hostname,
        port:               parseInt(parsedUrl.port) || 443,
        path:               parsedUrl.pathname + parsedUrl.search,
        method:             'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(bodyJson),
          'Cookie':         sessionCookie,
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            this.session = null;
            return reject(new Error(`Sesión expirada o sin permisos (${res.statusCode})`));
          }
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`SAP SL ${endpoint} → ${res.statusCode}: ${body}`));
          }
          try   { resolve(JSON.parse(body) as T); }
          catch { reject(new Error(`Error parseando respuesta SAP SL: ${body.substring(0, 300)}`)); }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout POST ${endpoint}`)); });
      req.write(bodyJson);
      req.end();
    });
  }
}