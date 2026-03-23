import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RendMService }     from './rend-m.service';
import { CreateRendMDto }   from './dto/create-rend-m.dto';
import { UpdateRendMDto }   from './dto/update-rend-m.dto';
import { PaginationDto, RendMQueryDto } from '../../common/dto/pagination.dto';
import { Roles }            from '../../auth/decorators/roles.decorator';
import { PerfilesService }  from '../perfiles/perfiles.service';

/** Etiqueta legible para el campo U_Trabaja del perfil */
const TRABAJA_LABEL: Record<string, string> = {
  '0': 'Moneda Local(BS)',
  '1': 'USD',
};

@ApiTags('Rendiciones-M')
@ApiBearerAuth()
@Controller('rend-m')
export class RendMController {
  constructor(
    private readonly rendMService:   RendMService,
    private readonly perfilesService: PerfilesService,
  ) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar cabeceras de rendición paginadas — filtradas por usuario logueado' })
  @ApiResponse({ status: 200, description: 'Resultado paginado de cabeceras REND_M' })
  findAll(
    @Req() req: any,
    @Query() query: RendMQueryDto,
  ) {
    return this.rendMService.findAll(
      req.user.role,
      String(req.user.sub),
      query.idPerfil,
      query,
    );
  }

  @Get('stats')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Estadísticas de rendiciones para el dashboard' })
  getStats(@Req() req: any) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.rendMService.getStats(String(req.user.sub), isAdmin);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener cabecera de rendición por ID' })
  @ApiResponse({ status: 200, description: 'Cabecera encontrada' })
  @ApiResponse({ status: 404, description: 'No encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rendMService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Crear cabecera de rendición' })
  @ApiResponse({ status: 201, description: 'Cabecera creada' })
  async create(@Body() dto: CreateRendMDto, @Req() req: any) {
    // Resolver el nombre completo del perfil: "<NombrePerfil>-<Trabaja label>"
    const perfil = await this.perfilesService.findOne(dto.idPerfil);
    const trabajaLabel = TRABAJA_LABEL[perfil.U_Trabaja] ?? perfil.U_Trabaja;
    const nombrePerfil = `${perfil.U_NombrePerfil}-${trabajaLabel}`;

    return this.rendMService.create(
      dto,
      String(req.user.sub),
      req.user.name,
      nombrePerfil,
    );
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Editar cabecera — USER solo puede editar las suyas en estado ABIERTO' })
  @ApiResponse({ status: 200, description: 'Cabecera actualizada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRendMDto,
    @Req() req: any,
  ) {
    return this.rendMService.update(id, dto, req.user.role, String(req.user.sub));
  }

  @Delete(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Eliminar cabecera — USER solo puede eliminar las suyas en estado ABIERTO' })
  @ApiResponse({ status: 200, description: 'Cabecera eliminada' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rendMService.remove(id, req.user.role, String(req.user.sub));
  }
}