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
import { CoaService } from './coa.service';
import {
  CrearCuentaDto,
  ActualizarCuentaDto,
  CuentaResponseDto,
} from './dto/coa.dto';

import { Roles } from '@auth/decorators/roles.decorator';
import { CuentaCOA } from './interfaces/coa.interface';

@ApiTags('Plan de Cuentas (COA)')
@ApiBearerAuth()
@Controller('coa')
export class CoaController {
  constructor(private readonly service: CoaService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todas las cuentas contables',
    description: 'Retorna la lista de cuentas del plan de cuentas con posibilidad de filtrar',
  })
  @ApiQuery({ name: 'code', required: false, description: 'Filtrar por código' })
  @ApiQuery({ name: 'name', required: false, description: 'Filtrar por nombre' })
  @ApiQuery({ name: 'activa', required: false, type: Boolean, description: 'Filtrar por estado' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['code', 'name', 'activa'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista de cuentas', type: [CuentaResponseDto] })
  async findAll(
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('activa') activa?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<CuentaCOA[]> {
    // Parsear activa manualmente para evitar errores con valores vacíos
    let activaBool: boolean | undefined;
    if (activa !== undefined && activa !== '') {
      activaBool = activa === 'true' || activa === '1';
    }
    return this.service.findAll({ code, name, activa: activaBool, sortBy, sortOrder });
  }

  @Get(':code')
  @ApiOperation({ summary: 'Obtener cuenta por código' })
  @ApiParam({ name: 'code', example: '110101' })
  @ApiResponse({ status: 200, description: 'Cuenta encontrada', type: CuentaResponseDto })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async findByCode(@Param('code') code: string): Promise<CuentaCOA> {
    return this.service.findByCode(code);
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear cuenta contable',
    description: 'Crea una nueva cuenta en el plan de cuentas',
  })
  @ApiResponse({ status: 201, description: 'Cuenta creada', type: CuentaResponseDto })
  @ApiResponse({ status: 409, description: 'Código duplicado' })
  async create(@Body() dto: CrearCuentaDto): Promise<CuentaCOA> {
    return this.service.create(dto);
  }

  @Put(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar cuenta' })
  @ApiParam({ name: 'code', example: '110101' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada', type: CuentaResponseDto })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async update(
    @Param('code') code: string,
    @Body() dto: ActualizarCuentaDto,
  ): Promise<CuentaCOA> {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar cuenta' })
  @ApiParam({ name: 'code', example: '110101' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  async remove(@Param('code') code: string): Promise<{ affected: number }> {
    return this.service.remove(code);
  }

  @Patch(':code/toggle-active')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Activar/Desactivar cuenta' })
  @ApiParam({ name: 'code', example: '110101' })
  @ApiResponse({ status: 200, description: 'Estado cambiado', type: CuentaResponseDto })
  async toggleActive(@Param('code') code: string): Promise<CuentaCOA> {
    return this.service.toggleActive(code);
  }
}
