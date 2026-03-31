import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_CONF_KEY } from '../../auth/decorators/require-conf.decorator';

/**
 * Guard que verifica que el usuario tenga appConf = 'Y' en el JWT.
 * Solo aplica a los endpoints decorados con @RequiereConf().
 * Un ADMIN sin appConf puede ver (GET) pero no puede crear/editar/eliminar.
 */
@Injectable()
export class ConfGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_CONF_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;   // endpoint no protegido por conf

    const { user } = context.switchToHttp().getRequest();
    if (user?.appConf === 'Y') return true;

    throw new ForbiddenException(
      'No tenés permiso para modificar configuraciones. ' +
      'Contactá al administrador para activar el permiso de Configuraciones en tu usuario.',
    );
  }
}