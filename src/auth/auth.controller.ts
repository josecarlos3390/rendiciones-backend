import { Controller, Get, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Ruta publica — no requiere JWT.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesion' })
  @ApiResponse({ status: 200, description: 'Login exitoso — retorna JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/refresh-token
   * Re-emite el JWT con datos actualizados desde HANA.
   */
  @Post('refresh-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renovar token JWT' })
  refreshToken(@Req() req: any) {
    return this.authService.refreshToken(req.user.sub);
  }

  /**
   * GET /auth/me
   * Devuelve el payload del JWT del usuario autenticado.
   */
  @Get('me')
  @ApiBearerAuth()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getProfile(@Req() req: any) {
    return req.user;
  }
}
