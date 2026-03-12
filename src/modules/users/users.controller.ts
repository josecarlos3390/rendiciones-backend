import { Body, Req, Controller, Get, Post, Patch, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Crear usuario en REND_U (solo ADMIN)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar todos los usuarios de REND_U (solo ADMIN)' })
  findAll() {
    return this.usersService.findAll();
  }

  // Rutas estaticas ANTES de rutas con parametros (:id)
  @Get('me')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener mi perfil desde REND_U' })
  getMe(@Req() req: any) {
    return this.usersService.findOne(req.user.sub);
  }

  @Patch('me')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Actualizar mi nombre en REND_U' })
  updateMe(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(req.user.sub, dto);
  }

  @Patch('me/password')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Cambiar mi contrasena en REND_U' })
  updatePassword(@Req() req: any, @Body() dto: UpdatePasswordDto) {
    return this.usersService.updatePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Actualizar usuario en REND_U (solo ADMIN)' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }
}