import {
  Controller, Get, Post, Delete,
  Body, Param, ParseIntPipe, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Permisos')
@ApiBearerAuth()
@Controller('permisos')
export class PermisosController {
  constructor(private readonly service: PermisosService) {}

  @Get('usuarios')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todos los usuarios activos' })
  findUsuarios() {
    return this.service.findUsuarios();
  }

  /**
   * GET /api/v1/permisos/mis-perfiles
   * Devuelve los perfiles asignados al usuario autenticado (cualquier rol).
   * Usa el sub del JWT para determinar el usuario — no requiere pasar el ID en la URL.
   */
  @Get('mis-perfiles')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Perfiles asignados al usuario autenticado' })
  getMisPerfiles(@Req() req: any) {
    return this.service.findByUsuario(req.user.sub);
  }

  @Get('usuario/:idUsuario')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar perfiles asignados a un usuario' })
  findByUsuario(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.findByUsuario(idUsuario);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Asignar perfil a usuario' })
  @ApiResponse({ status: 201, description: 'Permiso asignado' })
  @ApiResponse({ status: 409, description: 'Permiso ya existe' })
  create(@Body() dto: CreatePermisoDto) {
    return this.service.create(dto);
  }

  @Delete(':idUsuario/:idPerfil')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar permiso de usuario' })
  remove(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPerfil',  ParseIntPipe) idPerfil:  number,
  ) {
    return this.service.remove(idUsuario, idPerfil);
  }
}