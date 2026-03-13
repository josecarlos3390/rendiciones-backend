import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppConfigService } from './app-config.service';
import { Public } from '../../auth/decorators/public.decorator';

@ApiTags('App Config')
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

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
}