import { Injectable, Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);

  getPublicConfig() {
    // Re-leer el archivo .env en cada request para reflejar cambios sin reiniciar
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
      const raw = (
        parsed['BolivianosEs'] ??
        parsed['BOLIVIANOSES'] ??
        parsed['bolivianoses'] ??
        process.env['BolivianosEs'] ??
        'LOCAL'
      ).toUpperCase().trim();

      const bolivianosEs = (raw === 'SISTEMA' ? 'SISTEMA' : 'LOCAL') as 'LOCAL' | 'SISTEMA';
      this.logger.debug(`BolivianosEs (desde .env): "${bolivianosEs}"`);
      return { bolivianosEs };
    }

    // Fallback a process.env si no encuentra el archivo
    const raw = (process.env['BolivianosEs'] ?? 'LOCAL').toUpperCase().trim();
    const bolivianosEs = (raw === 'SISTEMA' ? 'SISTEMA' : 'LOCAL') as 'LOCAL' | 'SISTEMA';
    this.logger.debug(`BolivianosEs (desde process.env): "${bolivianosEs}"`);
    return { bolivianosEs };
  }
}