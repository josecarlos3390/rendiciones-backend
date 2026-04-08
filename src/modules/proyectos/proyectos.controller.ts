import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProyectosService } from './proyectos.service';
import {
  CrearProyectoDto,
  ActualizarProyectoDto,
  ProyectoResponseDto,
} from './dto/proyecto.dto';

import { Roles } from '@auth/decorators/roles.decorator';
import { Proyecto } from './interfaces/proyecto.interface';

@ApiTags('Proyectos')
@ApiBearerAuth()
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los proyectos',
    description: 'Retorna la lista de proyectos con posibilidad de filtrar por código, nombre y estado activo',
  })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Filtrar por código (búsqueda parcial)',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filtrar por nombre (búsqueda parcial)',
  })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['code', 'name', 'activo'],
    description: 'Campo para ordenar',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Dirección del ordenamiento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de proyectos obtenida exitosamente',
    type: [ProyectoResponseDto],
  })
  async findAll(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('activo') activo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<Proyecto[]> {
    // Parsear activo manualmente para evitar errores con valores vacíos
    let activoBool: boolean | undefined;
    if (activo !== undefined && activo !== '') {
      activoBool = activo === 'true' || activo === '1';
    }
    return this.service.findAll({
      code,
      name,
      activo: activoBool,
      sortBy,
      sortOrder,
    });
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Obtener un proyecto por código',
    description: 'Retorna los detalles de un proyecto específico',
  })
  @ApiParam({
    name: 'code',
    description: 'Código del proyecto',
    example: 'PRY001',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto encontrado',
    type: ProyectoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
  })
  async findByCode(@Param('code') code: string): Promise<Proyecto> {
    return this.service.findByCode(code);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo proyecto',
    description: 'Crea un nuevo proyecto en el sistema. Solo usuarios con rol ADMIN pueden crear proyectos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Proyecto creado exitosamente',
    type: ProyectoResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un proyecto con el mismo código',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para crear proyectos',
  })
  async create(@Body() dto: CrearProyectoDto): Promise<Proyecto> {
    return this.service.create(dto);
  }

  @Put(':code')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Actualizar un proyecto',
    description: 'Actualiza los datos de un proyecto existente. Solo usuarios con rol ADMIN pueden actualizar proyectos.',
  })
  @ApiParam({
    name: 'code',
    description: 'Código del proyecto a actualizar',
    example: 'PRY001',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto actualizado exitosamente',
    type: ProyectoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para actualizar proyectos',
  })
  async update(
    @Param('code') code: string,
    @Body() dto: ActualizarProyectoDto,
  ): Promise<Proyecto> {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Eliminar un proyecto',
    description: 'Elimina un proyecto del sistema. Solo usuarios con rol ADMIN pueden eliminar proyectos.',
  })
  @ApiParam({
    name: 'code',
    description: 'Código del proyecto a eliminar',
    example: 'PRY001',
  })
  @ApiResponse({
    status: 200,
    description: 'Proyecto eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para eliminar proyectos',
  })
  async remove(@Param('code') code: string): Promise<{ affected: number }> {
    return this.service.remove(code);
  }

  @Put(':code/toggle-active')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Cambiar estado activo/inactivo de un proyecto',
    description: 'Activa o desactiva un proyecto alternando su estado. Solo usuarios con rol ADMIN pueden realizar esta acción.',
  })
  @ApiParam({
    name: 'code',
    description: 'Código del proyecto',
    example: 'PRY001',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del proyecto cambiado exitosamente',
    type: ProyectoResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proyecto no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permisos para modificar proyectos',
  })
  async toggleActive(@Param('code') code: string): Promise<Proyecto> {
    return this.service.toggleActive(code);
  }
}
