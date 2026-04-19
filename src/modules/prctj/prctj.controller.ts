import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrctjService } from "./prctj.service";
import { SavePrctjDto } from "./dto/prctj.dto";
import type { RequestWithUser } from "@common/types";
import { Roles } from "@auth/decorators/roles.decorator";

@ApiTags("DistribuciÃ³n PRCTJ")
@ApiBearerAuth()
@Controller("rend-m/:idRendicion/detalle/:idRD/prctj")
export class PrctjController {
  constructor(private readonly svc: PrctjService) {}

  /** Obtiene las lÃ­neas de distribuciÃ³n de un documento */
  @Get()
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary: "Listar distribuciÃ³n porcentual de una lÃ­nea REND_D",
  })
  findAll(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Param("idRD", ParseIntPipe) idRD: number,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.findByLinea(
      idRendicion,
      idRD,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
      !req.user.nomSup?.trim(),
    );
  }

  /**
   * Guarda (reemplaza) la distribuciÃ³n completa de una lÃ­nea.
   * Porcentajes deben sumar 100.
   */
  @Post()
  @Roles("ADMIN", "USER")
  @ApiOperation({
    summary: "Guardar distribuciÃ³n porcentual â€” reemplaza la existente",
  })
  save(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Param("idRD", ParseIntPipe) idRD: number,
    @Body() dto: SavePrctjDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.save(
      idRendicion,
      idRD,
      dto,
      req.user.role,
      String(req.user.sub),
      Number(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
    );
  }

  /** Elimina toda la distribuciÃ³n de una lÃ­nea */
  @Delete()
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Eliminar distribuciÃ³n porcentual de una lÃ­nea" })
  delete(
    @Param("idRendicion", ParseIntPipe) idRendicion: number,
    @Param("idRD", ParseIntPipe) idRD: number,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.delete(
      idRendicion,
      idRD,
      req.user.role,
      String(req.user.sub),
    );
  }
}
