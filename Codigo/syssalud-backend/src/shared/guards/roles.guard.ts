import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Guard encargado del Control de Acceso Basado en Roles (RBAC).
 * Compara los roles definidos mediante el decorador `@Roles()` con el rol del usuario
 * autenticado que se encuentra adjunto en la solicitud (`req.user`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Verifica si el usuario autenticado tiene el rol necesario para ejecutar la acción.
   * @throws {ForbiddenException} Si el usuario no tiene los permisos suficientes.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        'Acceso denegado: No posee los permisos necesarios para realizar esta acción',
      );
    }

    return true;
  }
}