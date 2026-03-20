import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  getPublicConfig() {
    // Re-leer el archivo .env en cada request para reflejar cambios sin reiniciar
    const envPath = path.resolve(process.cwd(), '.env');

    let parsed: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
      parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
    }

    const get = (key: string, fallback = '') =>
      parsed[key] ?? parsed[key.toUpperCase()] ?? parsed[key.toLowerCase()] ?? process.env[key] ?? fallback;

    // ── BolivianosEs ────────────────────────────────────────────────────────
    const rawBs = get('BolivianosEs', 'LOCAL').toUpperCase().trim();
    const bolivianosEs = (rawBs === 'SISTEMA' ? 'SISTEMA' : 'LOCAL') as 'LOCAL' | 'SISTEMA';
    this.logger.debug(`BolivianosEs: "${bolivianosEs}"`);

    // ── APP_MODE ─────────────────────────────────────────────────────────────
    const rawMode = get('APP_MODE', 'ONLINE').toUpperCase().trim();
    const appMode = (rawMode === 'OFFLINE' ? 'OFFLINE' : 'ONLINE') as 'ONLINE' | 'OFFLINE';
    this.logger.debug(`APP_MODE: "${appMode}"`);

    // ── DB_TYPE ──────────────────────────────────────────────────────────────
    const dbType = get('DB_TYPE', 'HANA').toUpperCase().trim() as 'HANA' | 'SQLSERVER' | 'POSTGRES';
    this.logger.debug(`DB_TYPE: "${dbType}"`);

    return { bolivianosEs, appMode, dbType };
  }
}