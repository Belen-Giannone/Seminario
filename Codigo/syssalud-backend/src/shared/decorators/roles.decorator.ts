import { SetMetadata } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';

/** Clave utilizada en la metadata de NestJS para almacenar los roles asignados a una ruta */
export const ROLES_KEY = 'roles';

/**
 * Decorador personalizado para asignar los roles requeridos a una ruta o controlador.
 * Permite restringir el acceso únicamente a los perfiles indicados.
 *
 * @example @Roles(Rol.ASISTENTE, Rol.PROFESIONAL)
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
