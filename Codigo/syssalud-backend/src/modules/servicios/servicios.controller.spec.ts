/* eslint-disable @typescript-eslint/unbound-method -- los métodos sólo se usan como clave de metadata */
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ServiciosController } from './servicios.controller';

/** SER-041: RBAC sobre la metadata real del controller (SER-029). */
type Endpoint =
  | 'estado'
  | 'listar'
  | 'obtener'
  | 'profesionales'
  | 'crear'
  | 'actualizar'
  | 'darDeBaja';

function guardsDe(endpoint: Endpoint): unknown[] {
  return (
    (Reflect.getMetadata(
      GUARDS_METADATA,
      ServiciosController.prototype[endpoint],
    ) as unknown[]) ?? []
  );
}

function contexto(endpoint: Endpoint, rol: Rol): ExecutionContext {
  return {
    getHandler: () => ServiciosController.prototype[endpoint],
    getClass: () => ServiciosController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
}

describe('ServiciosController — RBAC', () => {
  const rolesGuard = new RolesGuard(new Reflector());

  it('_estado es público', () => {
    expect(guardsDe('estado')).toEqual([]);
  });

  it.each(['listar', 'obtener', 'profesionales'] as const)(
    '%s exige JWT y lo puede leer cualquier rol',
    (endpoint) => {
      expect(guardsDe(endpoint)).toEqual([JwtAuthGuard]);
    },
  );

  describe.each(['crear', 'actualizar', 'darDeBaja'] as const)(
    '%s',
    (endpoint) => {
      it('exige JWT + RolesGuard', () => {
        expect(guardsDe(endpoint)).toEqual([JwtAuthGuard, RolesGuard]);
      });

      it.each([Rol.PACIENTE, Rol.PROFESIONAL, Rol.DUENO])(
        'rechaza el rol %s (403)',
        (rol) => {
          expect(() => rolesGuard.canActivate(contexto(endpoint, rol))).toThrow(
            'Acceso denegado',
          );
        },
      );

      it('permite al ASISTENTE', () => {
        expect(rolesGuard.canActivate(contexto(endpoint, Rol.ASISTENTE))).toBe(
          true,
        );
      });
    },
  );
});
