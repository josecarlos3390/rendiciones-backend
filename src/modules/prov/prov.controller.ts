import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProvService } from './prov.service';
import { CreateProvDto } from './dto/create-prov.dto';

@ApiTags('Proveedores Eventuales')
@ApiBearerAuth()
@Controller('prov')
export class ProvController {
  constructor(private readonly svc: ProvService) {}

  @Get()
  @ApiOperation({ summary: 'Lista proveedores eventuales (REND_PROV)' })
  findAll() { return this.svc.findAll(); }

  @Get('by-nit')
  @ApiOperation({ summary: 'Busca proveedor por NIT' })
  findByNit(@Query('nit') nit: string) { return this.svc.findByNit(nit); }

  @Post('find-or-create')
  @ApiOperation({ summary: 'Busca proveedor por NIT, si no existe lo crea automáticamente' })
  findOrCreate(@Body() dto: CreateProvDto) { return this.svc.findOrCreate(dto); }

  @Post()
  @ApiOperation({ summary: 'Registra proveedor eventual' })
  create(@Body() dto: CreateProvDto) { return this.svc.create(dto); }

  @Delete(':nit')
  @ApiOperation({ summary: 'Elimina proveedor eventual por NIT' })
  remove(@Param('nit') nit: string) { return this.svc.remove(nit); }
}