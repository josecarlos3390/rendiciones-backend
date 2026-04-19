import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import type { RequestWithUser } from "@common/types";
import { Public } from "./decorators/public.decorator";
import { Roles } from "./decorators/roles.decorator";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Ruta publica â€” no requiere JWT.
   */
  @Public()
  @Post("login")
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // â† 5 intentos por minuto
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesion" })
  @ApiResponse({ status: 200, description: "Login exitoso â€” retorna JWT" })
  @ApiResponse({ status: 401, description: "Credenciales invalidas" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/refresh-token
   * Re-emite el JWT con datos actualizados desde HANA.
   */
  @Post("refresh-token")
  @Throttle({ default: { ttl: 60_000, limit: 20 } }) // â† mÃ¡s holgado
  @ApiBearerAuth()
  @ApiOperation({ summary: "Renovar token JWT" })
  refreshToken(@Req() req: RequestWithUser) {
    return this.authService.refreshToken(req.user.sub);
  }

  /**
   * GET /auth/me
   * Devuelve el payload del JWT del usuario autenticado.
   */
  @Get("me")
  @ApiBearerAuth()
  @Roles("ADMIN", "USER")
  @ApiOperation({ summary: "Obtener perfil del usuario autenticado" })
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }
}
