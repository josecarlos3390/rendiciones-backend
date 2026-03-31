import {
  Controller, Get, Post, Delete,
  Param, ParseIntPipe, Body, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrctjService } from './prctj.service';
import { SavePrctjDto } from './dto/prctj.dto';
import { Roles }        from '../../auth/decorators/roles.decorator';

@ApiTags('Distribución PRCTJ')
@ApiBearerAuth()
@Controller('rend-m/:idRendicion/detalle/:idRD/prctj')
export class PrctjController {
  constructor(private readonly svc: PrctjService) {}

  /** Obtiene las líneas de distribución de un documento */
  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar distribución porcentual de una línea REND_D' })
  findAll(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD',        ParseIntPipe) idRD:        number,
    @Req() req: any,
  ) {
    return this.svc.findByLinea(
      idRendicion, idRD,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
      !req.user.nomSup?.trim(),
    );
  }

  /**
   * Guarda (reemplaza) la distribución completa de una línea.
   * Porcentajes deben sumar 100.
   */
  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Guardar distribución porcentual — reemplaza la existente' })
  save(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD',        ParseIntPipe) idRD:        number,
    @Body() dto: SavePrctjDto,
    @Req() req: any,
  ) {
    return this.svc.save(
      idRendicion, idRD, dto,
      req.user.role,
      String(req.user.sub),
      Number(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
    );
  }

  /** Elimina toda la distribución de una línea */
  @Delete()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Eliminar distribución porcentual de una línea' })
  delete(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD',        ParseIntPipe) idRD:        number,
    @Req() req: any,
  ) {
    return this.svc.delete(
      idRendicion, idRD,
      req.user.role,
      String(req.user.sub),
    );
  }
}