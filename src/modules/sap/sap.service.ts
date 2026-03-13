import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

// ── Interfaces Service Layer ──────────────────────────────────────────────────

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
}

export interface EmpleadoDto {
  cardCode: string;
  cardName: string;
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
  private dimCache:   CacheEntry<DimensionWithRulesDto[]> | null = null;
  private rulesCache: CacheEntry<SLDistributionRule[]>    | null = null;
  private coaCache:   CacheEntry<ChartOfAccountDto[]>      | null = null;

  constructor(private readonly config: ConfigService) {}

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
      }));

    } catch (err: any) {
      this.session = null;
      this.logger.error('Error getEmpleados SAP SL:', err?.message ?? err);
      throw new InternalServerErrorException(
        `SAP BusinessPartners empleados: ${err?.message ?? 'Error desconocido'}`,
      );
    }
  }

  // ── Sesión: POST /Login → B1SESSION cookie ────────────────────────────────

  private async getSession(): Promise<string> {
    if (this.session && Date.now() < this.session.expiresAt) {
      return this.session.cookie;
    }

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

    this.session = { cookie, expiresAt: Date.now() + this.SESSION_TTL_MS };
    this.logger.log('Sesión SAP SL establecida');
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
}