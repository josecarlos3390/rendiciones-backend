import {
  Controller, Get, Post, Param, ParseIntPipe,
  Body, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiPropertyOptional } from '@nestjs/swagger';
import { AprobacionesService } from './aprobaciones.service';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { Throttle } from '@nestjs/throttler'; 

class AccionAprobacionDto {
  @ApiPropertyOptional({ description: 'Comentario opcional' })
  @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;
}

@ApiTags('Aprobaciones')
@ApiBearerAuth()
@Controller('aprobaciones')
export class AprobacionesController {
  constructor(private readonly svc: AprobacionesService) {}

  /** Rendiciones pendientes de aprobación para el usuario autenticado (nivel 1) */
  @Get('pendientes')
  @ApiOperation({ summary: 'Listar rendiciones pendientes de mi aprobación' })
  getPendientes(@Req() req: any) {
    return this.svc.getPendientes(req.user.username);
  }

  /** Rendiciones pendientes de nivel 2 (aprobadas por nivel 1) */
  @Get('pendientes-nivel2')
  @ApiOperation({ summary: 'Listar rendiciones de nivel 2 pendientes de mi aprobación' })
  getPendientesNivel2(@Req() req: any) {
    return this.svc.getPendientesNivel2(req.user.username);
  }

  /** Contador para el badge del sidebar (nivel 1) */
  @Get('count')
  @ApiOperation({ summary: 'Contar rendiciones pendientes de mi aprobación' })
  countPendientes(@Req() req: any) {
    return this.svc.countPendientes(req.user.username);
  }

  /** Contador de nivel 2 para el badge del sidebar */
  @Get('count-nivel2')
  @ApiOperation({ summary: 'Contar rendiciones de nivel 2 pendientes de mi aprobación' })
  countPendientesNivel2(@Req() req: any) {
    return this.svc.countPendientesNivel2(req.user.username);
  }

  /** Niveles de aprobación de una rendición */
  @Get(':idRendicion/niveles')
  @ApiOperation({ summary: 'Ver niveles de aprobación de una rendición' })
  getNiveles(@Param('idRendicion', ParseIntPipe) idRendicion: number) {
    return this.svc.getNiveles(idRendicion);
  }

  /** Enviar rendición al flujo de aprobación */
  @Post(':idRendicion/enviar')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Enviar rendición para aprobación' })
  enviar(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Req() req: any,
  ) {
    return this.svc.enviar(idRendicion, String(req.user.sub), req.user.username);
  }

  /** Aprobar rendición */
  @Post(':idRendicion/aprobar')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Aprobar rendición (nivel correspondiente)' })
  aprobar(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Body() dto: AccionAprobacionDto,
    @Req() req: any,
  ) {
    return this.svc.aprobar(idRendicion, req.user.username, dto.comentario);
  }

  /** Rechazar rendición */
  @Post(':idRendicion/rechazar')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Rechazar rendición — vuelve a ABIERTO' })
  rechazar(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Body() dto: AccionAprobacionDto,
    @Req() req: any,
  ) {
    return this.svc.rechazar(idRendicion, req.user.username, dto.comentario);
  }
}