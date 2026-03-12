import {
  Controller, Get, Post, Delete,
  Body, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CuentasCabeceraService } from './cuentas-cabecera.service';
import { CreateCuentaCabeceraDto } from './dto/create-cuenta-cabecera.dto';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Cuentas Cabecera')
@ApiBearerAuth()
@Controller('cuentas-cabecera')
export class CuentasCabeceraController {
  constructor(private readonly service: CuentasCabeceraService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar todas las cuentas cabecera (con nombre de perfil)' })
  findAll(@Query('perfil') perfil?: string) {
    if (perfil) return this.service.findByPerfil(Number(perfil));
    return this.service.findAll();
  }

  @Get('perfil/:idPerfil')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar cuentas cabecera de un perfil específico' })
  findByPerfil(@Param('idPerfil', ParseIntPipe) idPerfil: number) {
    return this.service.findByPerfil(idPerfil);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Agregar cuenta cabecera a un perfil (solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Cuenta agregada' })
  @ApiResponse({ status: 409, description: 'Cuenta ya existe en el perfil' })
  create(@Body() dto: CreateCuentaCabeceraDto) {
    return this.service.create(dto);
  }

  @Delete(':idPerfil/:cuentaSys')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar cuenta cabecera de un perfil (solo ADMIN)' })
  remove(
    @Param('idPerfil', ParseIntPipe) idPerfil: number,
    @Param('cuentaSys') cuentaSys: string,
  ) {
    return this.service.remove(idPerfil, cuentaSys);
  }
}
