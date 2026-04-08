import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('App Config')
@Controller('app-config')
export class AppConfigController {
  constructor(
    private readonly appConfigService: AppConfigService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  /**
   * Endpoint público — el frontend lo consume antes del login
   * para configurar opciones de UI (ej. etiquetas de moneda).
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Configuración pública de la aplicación' })
  getConfig() {
    return this.appConfigService.getPublicConfig();
  }

  /**
   * Endpoint público para obtener el modo de operación actual
   * Útil para el frontend mostrar indicador ONLINE/OFFLINE
   */
  @Public()
  @Get('mode')
  @ApiOperation({ summary: 'Obtener modo de operación (ONLINE/OFFLINE)' })
  getMode() {
    const mode = this.config.get<string>('app.mode', 'ONLINE').toUpperCase();
    const dbType = this.config.get<string>('app.dbType', 'HANA').toUpperCase();
    return {
      mode: mode === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
      dbType,
      isOffline: mode === 'OFFLINE',
    };
  }
}