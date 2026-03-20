import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ProvService } from './prov.service';
import { CreateProvDto } from './dto/create-prov.dto';

export class UpdateProvDto {
  @IsOptional() @IsString() @MaxLength(255) nit?:         string;
  @IsOptional() @IsString() @MaxLength(255) razonSocial?: string;
}

@ApiTags('Proveedores / Clientes / Empleados')
@ApiBearerAuth()
@Controller('prov')
export class ProvController {
  constructor(private readonly svc: ProvService) {}

  /**
   * GET /api/v1/prov
   * GET /api/v1/prov?tipo=PL  → solo proveedores locales
   * GET /api/v1/prov?tipo=CL  → solo clientes
   * GET /api/v1/prov?tipo=EL  → solo empleados
   */
  @Get()
  @ApiOperation({ summary: 'Lista entidades (proveedores, clientes, empleados)' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['PL', 'PE', 'CL', 'EL'],
              description: 'Filtrar por tipo. Sin filtro devuelve todos.' })
  findAll(@Query('tipo') tipo?: string) {
    return this.svc.findAll(tipo);
  }

  /**
   * POST /api/v1/prov
   * El código (PL00001, CL00001, etc.) se genera automáticamente.
   */
  @Post()
  @ApiOperation({ summary: 'Registra proveedor / cliente / empleado. El código se genera automáticamente.' })
  create(@Body() dto: CreateProvDto) {
    return this.svc.create(dto);
  }

  /**
   * PATCH /api/v1/prov/:codigo   (ej: /api/v1/prov/PL00001)
   */
  @Patch(':codigo')
  @ApiOperation({ summary: 'Actualiza NIT y/o razón social de una entidad' })
  update(@Param('codigo') codigo: string, @Body() dto: UpdateProvDto) {
    return this.svc.update(codigo, dto);
  }

  /**
   * DELETE /api/v1/prov/:codigo   (ej: /api/v1/prov/PL00001)
   */
  @Delete(':codigo')
  @ApiOperation({ summary: 'Elimina una entidad por su código (ej: PL00001)' })
  remove(@Param('codigo') codigo: string) {
    return this.svc.remove(codigo);
  }
}