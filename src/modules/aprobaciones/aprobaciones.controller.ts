import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { AprobacionesService } from "./aprobaciones.service";
import type { RequestWithUser } from "@common/types";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { Throttle } from "@nestjs/throttler";

class AccionAprobacionDto {
  @ApiPropertyOptional({ description: "Comentario opcional" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentario?: string;
}

@ApiTags("Aprobaciones")
@ApiBearerAuth()
@Controller("aprobaciones")
export class AprobacionesController {
  constructor(private readonly svc: AprobacionesService) {}

  /** Rendiciones pendientes de aprobaciÃ³n para el usuario autenticado (nivel 1) */
  @Get("pendientes")
  @ApiOperation({ summary: "Listar rendiciones pendientes de mi aprobaciÃ³n" })
  getPendientes(@Req() req: RequestWithUser) {
    return this.svc.getPendientes(req.user.username);
  }

  /** Rendiciones pendientes de nivel 2 (aprobadas por nivel 1) */
  @Get("pendientes-nivel2")
  @ApiOperation({
    summary: "Listar rendiciones de nivel 2 pendientes de mi aprobaciÃ³n",
  })
  getPendientesNivel2(@Req() req: RequestWithUser) {
    return this.svc.getPendientesNivel2(req.user.username);
  }

  /** Contador para el badge del sidebar (nivel 1) */
  @Get("count")
  @ApiOperation({ summary: "Contar rendiciones pendientes de mi aprobaciÃ³n" })
  countPendientes(@Req() req: RequestWithUser) {
    return this.svc.countPendientes(req.user.username);
  }

  /** Contador de nivel 2 para el badge del sidebar */
  @Get("count-nivel2")
  @ApiOperation({
    summary: "Contar rendiciones de nivel 2 pendientes de mi aprobaciÃ³n",
  })
  countPendientesNivel2(@Req() req: RequestWithUser) {
    return this.svc.countPendientesNivel2(req.user.username);
  }

  /** Niveles de aprobaciÃ³n de una rendiciÃ³n */
  @Get(":idRendicion/niveles")
  @ApiOperation({ summary: "Ver niveles de aprobaciÃ³n de una rendiciÃ³n" })
  getNiveles(@Param("idRendicion", ParseIntPipe) idRendicion: number) {
    return this.svc.getNiveles(idRendicion);
  }

  /** Enviar rendiciÃ³n al flujo de aprobaciÃ³n */
  @Post(":idRendicion/enviar")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Enviar rendiciÃ³n para aprobaciÃ³n" })
  enviar(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.enviar(
      idRendicion,
      String(req.user.sub),
      req.user.username,
    );
  }

  /** Aprobar rendiciÃ³n */
  @Post(":idRendicion/aprobar")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Aprobar rendiciÃ³n (nivel correspondiente)" })
  aprobar(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Body() dto: AccionAprobacionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.aprobar(idRendicion, req.user.username, dto.comentario);
  }

  /** Rechazar rendiciÃ³n */
  @Post(":idRendicion/rechazar")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: "Rechazar rendiciÃ³n â€” vuelve a ABIERTO" })
  rechazar(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Body() dto: AccionAprobacionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.rechazar(idRendicion, req.user.username, dto.comentario);
  }
}
