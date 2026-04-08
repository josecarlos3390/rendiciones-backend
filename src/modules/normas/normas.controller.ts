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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NormasService } from './normas.service';
import {
  CrearNormaDto,
  ActualizarNormaDto,
  NormaResponseDto,
  NormaConDimensionResponseDto,
} from './dto/norma.dto';

import { Roles } from '@auth/decorators/roles.decorator';
import { Norma, NormaConDimension } from './interfaces/norma.interface';

@ApiTags('Normas de Reparto')
@ApiBearerAuth()
@Controller('normas')
export class NormasController {
  constructor(private readonly service: NormasService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las normas de reparto',
    description: 'Retorna la lista de normas con información de la dimensión asociada',
  })
  @ApiQuery({ name: 'factorCode', required: false, description: 'Filtrar por código de factor' })
  @ApiQuery({ name: 'descripcion', required: false, description: 'Filtrar por descripción' })
  @ApiQuery({ name: 'dimension', required: false, type: Number, description: 'Filtrar por dimensión' })
  @ApiQuery({ name: 'activa', required: false, type: Boolean, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['factorCode', 'descripcion', 'dimension', 'activa'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista de normas', type: [NormaConDimensionResponseDto] })
  async findAll(
    @Query('factorCode') factorCode?: string,
    @Query('descripcion') descripcion?: string,
    @Query('dimension') dimension?: string,
    @Query('activa') activa?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<NormaConDimension[]> {
    // Parsear dimension manualmente para evitar errores con valores vacíos
    let dimensionNum: number | undefined;
    if (dimension !== undefined && dimension !== '') {
      const parsed = parseInt(dimension, 10);
      if (!isNaN(parsed)) dimensionNum = parsed;
    }
    // Parsear activa manualmente para evitar errores con valores vacíos
    let activaBool: boolean | undefined;
    if (activa !== undefined && activa !== '') {
      activaBool = activa === 'true' || activa === '1';
    }
    return this.service.findAll({ factorCode, descripcion, dimension: dimensionNum, activa: activaBool, sortBy, sortOrder });
  }

  @Get(':factorCode')
  @ApiOperation({ summary: 'Obtener norma por código de factor' })
  @ApiParam({ name: 'factorCode', example: 'ADM' })
  @ApiResponse({ status: 200, description: 'Norma encontrada', type: NormaResponseDto })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async findByFactorCode(@Param('factorCode') factorCode: string): Promise<Norma> {
    return this.service.findByFactorCode(factorCode);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear norma de reparto',
    description: 'Crea una nueva norma para distribución de importes',
  })
  @ApiResponse({ status: 201, description: 'Norma creada', type: NormaResponseDto })
  @ApiResponse({ status: 409, description: 'Código duplicado' })
  @ApiResponse({ status: 400, description: 'Dimensión no existe' })
  async create(@Body() dto: CrearNormaDto): Promise<Norma> {
    return this.service.create(dto);
  }

  @Put(':factorCode')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar norma' })
  @ApiParam({ name: 'factorCode', example: 'ADM' })
  @ApiResponse({ status: 200, description: 'Norma actualizada', type: NormaResponseDto })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  @ApiResponse({ status: 400, description: 'Dimensión no existe' })
  async update(
    @Param('factorCode') factorCode: string,
    @Body() dto: ActualizarNormaDto,
  ): Promise<Norma> {
    return this.service.update(factorCode, dto);
  }

  @Delete(':factorCode')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar norma' })
  @ApiParam({ name: 'factorCode', example: 'ADM' })
  @ApiResponse({ status: 200, description: 'Norma eliminada' })
  @ApiResponse({ status: 404, description: 'Norma no encontrada' })
  async remove(@Param('factorCode') factorCode: string): Promise<{ affected: number }> {
    return this.service.remove(factorCode);
  }

  @Patch(':factorCode/toggle-active')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activar/Desactivar norma' })
  @ApiParam({ name: 'factorCode', example: 'ADM' })
  @ApiResponse({ status: 200, description: 'Estado cambiado', type: NormaResponseDto })
  async toggleActive(@Param('factorCode') factorCode: string): Promise<Norma> {
    return this.service.toggleActive(factorCode);
  }
}
