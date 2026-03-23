import { Controller, Get, Post, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegracionService } from './integracion.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Integracion')
@ApiBearerAuth()
@Controller('integracion')
export class IntegracionController {
  constructor(private readonly svc: IntegracionService) {}

  @Get('pendientes')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Rendiciones APROBADAS pendientes de sincronización con ERP' })
  getPendientes() {
    return this.svc.getPendientes();
  }

  @Get('count')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Contador de pendientes — badge sidebar' })
  countPendientes() {
    return this.svc.countPendientes();
  }

  @Get(':id/historial')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Historial de intentos de sincronización de una rendición' })
  getHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getHistorial(id);
  }

  @Post(':id/sincronizar')
  @Roles('ADMIN', 'USER')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Sincronizar rendición con ERP' })
  sincronizar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.sincronizar(id, req.user.username);
  }
}