import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RendDService }    from './rend-d.service';
import { CreateRendDDto }  from './dto/create-rend-d.dto';
import { UpdateRendDDto }  from './dto/update-rend-d.dto';
import { Roles }           from '../../auth/decorators/roles.decorator';

@ApiTags('Rendiciones-D')
@ApiBearerAuth()
@Controller('rend-m/:idRendicion/detalle')
export class RendDController {
  constructor(private readonly rendDService: RendDService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar documentos de una rendición' })
  @ApiResponse({ status: 200, description: 'Lista de documentos REND_D' })
  findAll(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Req() req: any,
  ) {
    return this.rendDService.findByRendicion(
      idRendicion,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
      req.user.nomSup === '' || !req.user.nomSup,   // sinAprobador
    );
  }

  @Get(':idRD')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener documento por ID' })
  findOne(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD', ParseIntPipe) idRD: number,
    @Req() req: any,
  ) {
    return this.rendDService.findOne(
      idRendicion, idRD,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
      req.user.nomSup === '' || !req.user.nomSup,
    );
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Agregar documento a una rendición' })
  @ApiResponse({ status: 201, description: 'Documento creado' })
  create(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Body() dto: CreateRendDDto,
    @Req() req: any,
  ) {
    return this.rendDService.create(
      idRendicion,
      Number(req.user.sub),
      req.user.role,
      String(req.user.sub),
      dto,
    );
  }

  @Patch(':idRD')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Editar documento' })
  update(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD', ParseIntPipe) idRD: number,
    @Body() dto: UpdateRendDDto,
    @Req() req: any,
  ) {
    return this.rendDService.update(
      idRendicion, idRD, dto,
      req.user.role,
      String(req.user.sub),
      req.user.username,
      req.user.esAprobador === true,
    );
  }

  @Delete(':idRD')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Eliminar documento' })
  remove(
    @Param('idRendicion', ParseIntPipe) idRendicion: number,
    @Param('idRD', ParseIntPipe) idRD: number,
    @Req() req: any,
  ) {
    return this.rendDService.remove(idRendicion, idRD, req.user.role, String(req.user.sub));
  }
}