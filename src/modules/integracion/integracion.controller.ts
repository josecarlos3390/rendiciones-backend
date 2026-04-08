import { Controller, Get, Post, Param, ParseIntPipe, Req, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegracionService } from './integracion.service';
import { SyncRendicionDto }   from './dto/sync-rendicion.dto';
import { Roles }              from '../../auth/decorators/roles.decorator';
import { Throttle }           from '@nestjs/throttler';

@ApiTags('Integracion')
@ApiBearerAuth()
@Controller('integracion')
export class IntegracionController {
  constructor(private readonly svc: IntegracionService) {}

  @Get('pendientes')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Rendiciones APROBADAS pendientes de sincronización con ERP' })
  getPendientes(@Req() req: any) {
    const isAdmin      = req.user.role === 'ADMIN';
    const sinAprobador = !req.user.nomSup?.trim();
    return this.svc.getPendientes(
      req.user.username,
      isAdmin,
      sinAprobador,
    );
  }

  @Get('mis-rendiciones')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Rendiciones del usuario logueado en estados 7 (aprobado), 5 (sync) y 6 (error)' })
  getMisRendiciones(@Req() req: any) {
    return this.svc.getMisRendiciones(String(req.user.sub));
  }

  @Get('count')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Contador de pendientes — badge sidebar' })
  countPendientes(@Req() req: any) {
    const isAdmin      = req.user.role === 'ADMIN';
    const sinAprobador = !req.user.nomSup?.trim();
    return this.svc.countPendientes(
      req.user.username,
      isAdmin,
      sinAprobador,
    );
  }

  @Get(':id/historial')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Historial de intentos de sincronización de una rendición' })
  getHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getHistorial(id);
  }

  @Post(':id/sincronizar')
  @Roles('ADMIN', 'USER')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Sincronizar rendición con SAP Business One vía Service Layer' })
  sincronizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncRendicionDto,
    @Req() req: any,
  ) {
    return this.svc.sincronizar(
      id,
      req.user.username,        // para auditoría en REND_SYNC (U_Login legible)
      String(req.user.sub),     // para comparar con U_IdUsuario de REND_M
      req.user.role,
      dto,
    );
  }
}