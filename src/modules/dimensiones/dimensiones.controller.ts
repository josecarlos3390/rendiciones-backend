import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DimensionesService } from './dimensiones.service';
import {
  CrearDimensionDto,
  ActualizarDimensionDto,
  DimensionResponseDto,
} from './dto/dimension.dto';

import { Roles } from '@auth/decorators/roles.decorator';
import { Dimension } from './interfaces/dimension.interface';

@ApiTags('Dimensiones')
@ApiBearerAuth()
@Controller('dimensiones')
export class DimensionesController {
  constructor(private readonly service: DimensionesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las dimensiones',
    description: 'Retorna la lista de dimensiones para normas de reparto',
  })
  @ApiQuery({ name: 'code', required: false, description: 'Filtrar por código numérico' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar por nombre' })
  @ApiQuery({ name: 'activa', required: false, type: Boolean, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['code', 'name', 'activa'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista de dimensiones', type: [DimensionResponseDto] })
  async findAll(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('activa') activa?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<Dimension[]> {
    // Parsear code manualmente para evitar errores con valores vacíos
    let codeNum: number | undefined;
    if (code !== undefined && code !== '') {
      const parsed = parseInt(code, 10);
      if (!isNaN(parsed)) codeNum = parsed;
    }
    // Parsear activa manualmente para evitar errores con valores vacíos
    let activaBool: boolean | undefined;
    if (activa !== undefined && activa !== '') {
      activaBool = activa === 'true' || activa === '1';
    }
    return this.service.findAll({ code: codeNum, name, activa: activaBool, sortBy, sortOrder });
  }

  @Get(':code')
  @ApiOperation({ summary: 'Obtener dimensión por código' })
  @ApiParam({ name: 'code', example: 1 })
  @ApiResponse({ status: 200, description: 'Dimensión encontrada', type: DimensionResponseDto })
  @ApiResponse({ status: 404, description: 'Dimensión no encontrada' })
  async findByCode(
    @Param('code', ParseIntPipe) code: number,
  ): Promise<Dimension> {
    return this.service.findByCode(code);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear dimensión',
    description: 'Crea una nueva dimensión para normas de reparto',
  })
  @ApiResponse({ status: 201, description: 'Dimensión creada', type: DimensionResponseDto })
  @ApiResponse({ status: 409, description: 'Código duplicado' })
  async create(@Body() dto: CrearDimensionDto): Promise<Dimension> {
    return this.service.create(dto);
  }

  @Put(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar dimensión' })
  @ApiParam({ name: 'code', example: 1 })
  @ApiResponse({ status: 200, description: 'Dimensión actualizada', type: DimensionResponseDto })
  @ApiResponse({ status: 404, description: 'Dimensión no encontrada' })
  async update(
    @Param('code', ParseIntPipe) code: number,
    @Body() dto: ActualizarDimensionDto,
  ): Promise<Dimension> {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar dimensión' })
  @ApiParam({ name: 'code', example: 1 })
  @ApiResponse({ status: 200, description: 'Dimensión eliminada' })
  @ApiResponse({ status: 404, description: 'Dimensión no encontrada' })
  async remove(
    @Param('code', ParseIntPipe) code: number,
  ): Promise<{ affected: number }> {
    return this.service.remove(code);
  }

  @Patch(':code/toggle-active')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activar/Desactivar dimensión' })
  @ApiParam({ name: 'code', example: 1 })
  @ApiResponse({ status: 200, description: 'Estado cambiado', type: DimensionResponseDto })
  async toggleActive(
    @Param('code', ParseIntPipe) code: number,
  ): Promise<Dimension> {
    return this.service.toggleActive(code);
  }
}
