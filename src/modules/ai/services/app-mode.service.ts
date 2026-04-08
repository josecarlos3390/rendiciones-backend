import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModeConfig, DbType, AppMode } from '../../../config/app-mode.config';

/**
 * Servicio para detectar y gestionar el modo de operación
 * ONLINE: Usa SAP Service Layer + HANA/SQL Server
 * OFFLINE: Usa Postgres local sin SAP
 */
@Injectable()
export class AppModeService {
  private readonly logger = new Logger(AppModeService.name);

  constructor(private readonly configService: ConfigService) {
    this.logConfiguration();
  }

  /**
   * Obtiene la configuración completa del modo
   */
  get config(): AppModeConfig {
    return this.configService.get<AppModeConfig>('appMode', {
      dbType: 'HANA',
      appMode: 'ONLINE',
      isOnline: true,
      isOffline: false,
      usesServiceLayer: true,
      isValidConfiguration: true,
    });
  }

  /**
   * true si está en modo ONLINE
   */
  get isOnline(): boolean {
    return this.configService.get('appMode.isOnline', false);
  }

  /**
   * true si está en modo OFFLINE
   */
  get isOffline(): boolean {
    return this.configService.get('appMode.isOffline', false);
  }

  /**
   * true si usa SAP Service Layer
   */
  get usesServiceLayer(): boolean {
    return this.configService.get('appMode.usesServiceLayer', false);
  }

  /**
   * Tipo de base de datos configurada
   */
  get dbType(): DbType {
    return this.configService.get('appMode.dbType', 'HANA');
  }

  /**
   * Modo de aplicación configurado
   */
  get appMode(): AppMode {
    return this.configService.get('appMode.appMode', 'ONLINE');
  }

  /**
   * true si la configuración es válida
   */
  get isValidConfiguration(): boolean {
    return this.configService.get('appMode.isValidConfiguration', true);
  }

  /**
   * Obtiene el estado del modo para APIs/debug
   */
  getStatus() {
    return {
      dbType: this.dbType,
      appMode: this.appMode,
      isOnline: this.isOnline,
      isOffline: this.isOffline,
      usesServiceLayer: this.usesServiceLayer,
      isValidConfiguration: this.isValidConfiguration,
    };
  }

  /**
   * Verifica que la configuración sea válida, lanza error si no lo es
   */
  validateConfiguration(): void {
    if (!this.isValidConfiguration) {
      throw new Error(
        `Configuración inválida: DB_TYPE=${this.dbType} + APP_MODE=${this.appMode}. ` +
        `Combinaciones válidas: HANA/SQLSERVER+ONLINE o POSTGRES+OFFLINE`
      );
    }
  }

  /**
   * Log de la configuración al iniciar
   */
  private logConfiguration(): void {
    const status = this.getStatus();
    
    this.logger.log('══════════════════════════════════════════════════');
    this.logger.log('  MODO DE OPERACIÓN CONFIGURADO');
    this.logger.log('══════════════════════════════════════════════════');
    this.logger.log(`  DB_TYPE:        ${status.dbType}`);
    this.logger.log(`  APP_MODE:       ${status.appMode}`);
    this.logger.log(`  Service Layer:  ${status.usesServiceLayer ? 'SÍ' : 'NO'}`);
    this.logger.log(`  Config válida:  ${status.isValidConfiguration ? '✅' : '❌'}`);
    this.logger.log('══════════════════════════════════════════════════');

    if (!status.isValidConfiguration) {
      this.logger.error('⚠️  ADVERTENCIA: La configuración actual no es válida');
    }
  }
}
