import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { IntegracionService } from "./integracion.service";
import { SyncRendicionDto } from "./dto/sync-rendicion.dto";
import type { RequestWithUser } from "@common/types";
import { Roles } from "@auth/decorators/roles.decorator";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Integracion")
@ApiBearerAuth()
@Controller("integracion")
export class IntegracionController {
  constructor(private readonly svc: IntegracionService) {}

  @Get("pendientes")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary: "Rendiciones APROBADAS pendientes de sincronizaciÃ³n con ERP",
  })
  getPendientes(@Req() req: RequestWithUser) {
    const isAdmin = req.user.role === "ADMIN";
    const sinAprobador = !req.user.nomSup?.trim();
    return this.svc.getPendientes(req.user.username, isAdmin, sinAprobador);
  }

  @Get("mis-rendiciones")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary:
      "Rendiciones del usuario logueado en estados 7 (aprobado), 5 (sync) y 6 (error)",
  })
  getMisRendiciones(@Req() req: RequestWithUser) {
    return this.svc.getMisRendiciones(String(req.user.sub));
  }

  @Get("count")
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Contador de pendientes â€” badge sidebar" })
  countPendientes(@Req() req: RequestWithUser) {
    const isAdmin = req.user.role === "ADMIN";
    const sinAprobador = !req.user.nomSup?.trim();
    return this.svc.countPendientes(req.user.username, isAdmin, sinAprobador);
  }

  @Get(":id/historial")
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary: "Historial de intentos de sincronizaciÃ³n de una rendiciÃ³n",
  })
  getHistorial(@Param("id", ParseIntPipe) id: number) {
    return this.svc.getHistorial(id);
  }

  @Post(":id/sincronizar")
  @Roles("ADMIN", "USER")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({
    summary: "Sincronizar rendiciÃ³n con SAP Business One vÃ­a Service Layer",
  })
  sincronizar(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SyncRendicionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.sincronizar(
      id,
      req.user.username, // para auditorÃ­a en REND_SYNC (U_Login legible)
      String(req.user.sub), // para comparar con U_IdUsuario de REND_M
      req.user.role,
      dto,
      req.user.genDocPre === "1", // puede generar preliminar
      !req.user.nomSup?.trim(), // sin aprobador
    );
  }
}
