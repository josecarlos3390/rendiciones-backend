import { Module }        from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SapService }        from './sap.service';
import { OfflineSapService } from './offline-sap.service';
import { SapController }     from './sap.controller';
import { SAP_SERVICE }       from './sap.tokens';

// Re-exportar el token para que otros módulos puedan importarlo
export { SAP_SERVICE } from './sap.tokens';

/**
 * Combinaciones válidas de APP_MODE + DB_TYPE:
 *
 *   APP_MODE=ONLINE  + DB_TYPE=HANA       → SapService (SAP SL) + HanaService
 *   APP_MODE=ONLINE  + DB_TYPE=SQLSERVER  → SapService (SAP SL) + SqlServerService
 *   APP_MODE=OFFLINE + DB_TYPE=POSTGRES   → OfflineSapService   + PostgresService
 */
@Module({
  controllers: [SapController],
  providers: [
    SapService,
    OfflineSapService,
    {
      provide:  SAP_SERVICE,
      inject:   [ConfigService, SapService, OfflineSapService],
      useFactory: (
        config:  ConfigService,
        online:  SapService,
        offline: OfflineSapService,
      ) => {
        const mode = (config.get<string>('app.mode', 'ONLINE')).toUpperCase();
        if (mode === 'OFFLINE') {
          return offline;
        }
        return online;
      },
    },
  ],
  exports: [SAP_SERVICE, SapService],
})
export class SapModule {}