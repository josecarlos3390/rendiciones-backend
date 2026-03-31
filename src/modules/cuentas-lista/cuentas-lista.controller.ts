import {
  Controller, Get, Post, Delete,
  Body, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CuentasListaService } from './cuentas-lista.service';
import { CreateCuentaListaDto } from './dto/create-cuenta-lista.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequiereConf } from '../../auth/decorators/require-conf.decorator';

@ApiTags('Cuentas Lista')
@ApiBearerAuth()
@Controller('cuentas-lista')
export class CuentasListaController {
  constructor(private readonly service: CuentasListaService) {}

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar todas las cuentas (con nombre de perfil)' })
  @ApiQuery({ name: 'perfil', required: false, type: Number, description: 'Filtrar por ID de perfil' })
  findAll(@Query('perfil') perfil?: string) {
    if (perfil) {
      return this.service.findByPerfil(Number(perfil));
    }
    return this.service.findAll();
  }

  @Get('perfil/:idPerfil')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Listar cuentas de un perfil específico' })
  findByPerfil(@Param('idPerfil', ParseIntPipe) idPerfil: number) {
    return this.service.findByPerfil(idPerfil);
  }

  @RequiereConf()
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Agregar cuenta a un perfil (solo ADMIN)' })
  @ApiResponse({ status: 201, description: 'Cuenta agregada' })
  @ApiResponse({ status: 409, description: 'Cuenta ya existe en el perfil' })
  create(@Body() dto: CreateCuentaListaDto) {
    return this.service.create(dto);
  }

  @RequiereConf()
  @Delete(':idPerfil/:cuentaSys')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar cuenta de un perfil (solo ADMIN)' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  remove(
    @Param('idPerfil', ParseIntPipe) idPerfil: number,
    @Param('cuentaSys') cuentaSys: string,
  ) {
    return this.service.remove(idPerfil, cuentaSys);
  }
}