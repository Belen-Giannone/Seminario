import { SetMetadata } from '@nestjs/common';

/** Clave utilizada en la metadata de NestJS para almacenar los roles asignados a una ruta */
export const ROLES_KEY = 'roles';

/**
 * Decorador personalizado para asignar los roles requeridos a una ruta o controlador.
 * Permite restringir el acceso únicamente a los perfiles indicados.
 * 
 * @param roles Lista de roles permitidos ('PACIENTE' | 'PROFESIONAL' | 'ADMINISTRATIVO')
 * @example @Roles('ADMINISTRATIVO', 'PROFESIONAL')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);