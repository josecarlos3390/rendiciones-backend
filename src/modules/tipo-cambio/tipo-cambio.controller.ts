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
import { TipoCambioService } from './tipo-cambio.service';
import { CreateTipoCambioDto, UpdateTipoCambioDto } from './dto/create-tipo-cambio.dto';
import { Roles } from '@auth/decorators/roles.decorator';
import { ITipoCambio } from './interfaces/tipo-cambio.interface';

/**
 * Respuesta de API para Tipo de Cambio (formato sin U_ para frontend)
 */
interface TipoCambioResponse {
  id: number;
  fecha: string;
  moneda: string;
  tasa: number;
  activo: string;
}

@ApiTags('Tipos de Cambio')
@ApiBearerAuth()
@Controller('tipo-cambio')
export class TipoCambioController {
  constructor(private readonly service: TipoCambioService) {}

  /**
   * Mapear ITipoCambio (interno con U_) a formato de API (sin U_)
   */
  private mapToResponse(item: ITipoCambio): TipoCambioResponse {
    return {
      id: item.U_IdTipoCambio!,
      fecha: item.U_Fecha,
      moneda: item.U_Moneda,
      tasa: item.U_Tasa,
      activo: item.U_Activo,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los tipos de cambio',
    description: 'Retorna la lista de tipos de cambio con posibilidad de filtrar',
  })
  @ApiQuery({ name: 'fecha', required: false, description: 'Filtrar por fecha (YYYY-MM-DD)' })
  @ApiQuery({ name: 'moneda', required: false, description: 'Filtrar por moneda (ej: USD)' })
  @ApiQuery({ name: 'activo', required: false, description: 'Filtrar por estado (Y/N)' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de cambio', type: [CreateTipoCambioDto] })
  async findAll(
    @Query('fecha') fecha?: string,
    @Query('moneda') moneda?: string,
    @Query('activo') activo?: string,
  ): Promise<TipoCambioResponse[]> {
    const result = await this.service.findAll({ fecha, moneda, activo });
    return result.map(item => this.mapToResponse(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de cambio por ID' })
  @ApiParam({ name: 'id', description: 'ID del tipo de cambio' })
  @ApiResponse({ status: 200, description: 'Tipo de cambio encontrado' })
  @ApiResponse({ status: 404, description: 'Tipo de cambio no encontrado' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<TipoCambioResponse | null> {
    const result = await this.service.findAll();
    const item = result.find(item => item.U_IdTipoCambio === id);
    return item ? this.mapToResponse(item) : null;
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear o actualizar tipo de cambio',
    description: 'Crea un nuevo tipo de cambio. Si ya existe para la fecha/moneda, lo actualiza.',
  })
  @ApiResponse({ status: 201, description: 'Tipo de cambio creado o actualizado' })
  async create(@Body() dto: CreateTipoCambioDto): Promise<TipoCambioResponse> {
    const result = await this.service.create(dto);
    return this.mapToResponse(result);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar tipo de cambio' })
  @ApiParam({ name: 'id', description: 'ID del tipo de cambio' })
  @ApiResponse({ status: 200, description: 'Tipo de cambio actualizado' })
  @ApiResponse({ status: 404, description: 'Tipo de cambio no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTipoCambioDto,
  ): Promise<TipoCambioResponse> {
    const result = await this.service.update(id, dto);
    return this.mapToResponse(result);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar tipo de cambio' })
  @ApiParam({ name: 'id', description: 'ID del tipo de cambio' })
  @ApiResponse({ status: 200, description: 'Tipo de cambio eliminado' })
  @ApiResponse({ status: 404, description: 'Tipo de cambio no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }

  @Get('tasa/:fecha/:moneda')
  @ApiOperation({ 
    summary: 'Obtener tasa de cambio para una fecha y moneda',
    description: 'Retorna solo el valor numérico de la tasa'
  })
  @ApiParam({ name: 'fecha', example: '2026-01-01', description: 'Fecha (YYYY-MM-DD)' })
  @ApiParam({ name: 'moneda', example: 'USD', description: 'Código de moneda' })
  @ApiResponse({ status: 200, description: 'Tasa de cambio' })
  @ApiResponse({ status: 404, description: 'Tipo de cambio no encontrado' })
  async obtenerTasa(
    @Param('fecha') fecha: string,
    @Param('moneda') moneda: string,
  ): Promise<{ tasa: number }> {
    const tasa = await this.service.obtenerTasa(fecha, moneda);
    return { tasa };
  }
}
