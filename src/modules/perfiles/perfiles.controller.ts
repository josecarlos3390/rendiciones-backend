import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PerfilesService } from './perfiles.service';
import { CreatePerfilDto } from './dto/create-perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequiereConf } from '../../auth/decorators/require-conf.decorator';

@ApiTags('Perfiles')
@ApiBearerAuth()
@Controller('perfiles')
export class PerfilesController {
  constructor(private readonly perfilesService: PerfilesService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar todos los perfiles' })
  @ApiResponse({ status: 200, description: 'Lista de perfiles' })
  findAll() {
    return this.perfilesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener perfil por ID' })
  @ApiResponse({ status: 200, description: 'Perfil encontrado' })
  @ApiResponse({ status: 404, description: 'No encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.perfilesService.findOne(id);
  }

  @RequiereConf()
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear perfil (solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Perfil creado' })
  create(@Body() dto: CreatePerfilDto) {
    return this.perfilesService.create(dto);
  }

  @RequiereConf()
  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar perfil (solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePerfilDto,
  ) {
    return this.perfilesService.update(id, dto);
  }

  @RequiereConf()
  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar perfil (solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Perfil eliminado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.perfilesService.remove(id);
  }
}