import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RendMService }     from './rend-m.service';
import { CreateRendMDto }   from './dto/create-rend-m.dto';
import { UpdateRendMDto }   from './dto/update-rend-m.dto';
import { Roles }            from '../../auth/decorators/roles.decorator';

@ApiTags('Rendiciones-M')
@ApiBearerAuth()
@Controller('rend-m')
export class RendMController {
  constructor(private readonly rendMService: RendMService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar cabeceras de rendición — ADMIN ve todas, USER ve las suyas' })
  @ApiResponse({ status: 200, description: 'Lista de cabeceras REND_M' })
  findAll(@Req() req: any) {
    return this.rendMService.findAll(req.user.role, String(req.user.sub));
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
  create(@Body() dto: CreateRendMDto, @Req() req: any) {
    return this.rendMService.create(
      dto,
      String(req.user.sub),   // idUsuario  (U_IdUsuario es NVARCHAR en REND_M)
      req.user.name,           // nomUsuario
      dto.idPerfil.toString(), // nombrePerfil se resuelve en el repositorio con el idPerfil;
                               // si querés el nombre completo, pasalo en el DTO o consultá REND_PERFIL
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
