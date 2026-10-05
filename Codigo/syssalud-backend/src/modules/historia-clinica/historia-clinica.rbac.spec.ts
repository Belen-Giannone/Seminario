import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { HistoriaClinicaController } from './historia-clinica.controller';

/** HCL-031 (RN10): se evalúa la metadata real del controller, endpoint por endpoint. */
const ENDPOINTS = [
  'estado',
  'buscar',
  'obtener',
  'inicializar',
  'agregarEntrada',
] as const;

function contexto(
  handler: (typeof ENDPOINTS)[number],
  rol: Rol,
): ExecutionContext {
  return {
    // Sólo se usa como clave de metadata; nunca se invoca.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    getHandler: () => HistoriaClinicaController.prototype[handler],
    getClass: () => HistoriaClinicaController,
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
}

describe('RBAC de Historia Clínica (RN10)', () => {
  const guard = new RolesGuard(new Reflector());

  it('aplica JwtAuthGuard y RolesGuard a todo el controller', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      HistoriaClinicaController,
    ) as unknown[];
    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
  });

  describe.each(ENDPOINTS)('%s', (handler) => {
    it.each([Rol.PACIENTE, Rol.ASISTENTE, Rol.DUENO])(
      'rechaza el rol %s',
      (rol) => {
        expect(() => guard.canActivate(contexto(handler, rol))).toThrow(
          'Acceso denegado',
        );
      },
    );

    it('permite al profesional', () => {
      expect(guard.canActivate(contexto(handler, Rol.PROFESIONAL))).toBe(true);
    });
  });
});
