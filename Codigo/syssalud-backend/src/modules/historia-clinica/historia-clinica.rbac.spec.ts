import { ExecutionContext } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { RolesGuard } from '../../shared/guards/roles.guard';

function contextoConRol(rol: Rol): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user: { rol } }) }),
  } as unknown as ExecutionContext;
}

describe('RBAC de Historia Clínica', () => {
  function crearGuard() {
    return new RolesGuard({
      getAllAndOverride: jest.fn().mockReturnValue([Rol.PROFESIONAL]),
    } as never);
  }

  it.each([Rol.PACIENTE, Rol.ASISTENTE, Rol.DUENO])('rechaza el rol %s', (rol) => {
    expect(() => crearGuard().canActivate(contextoConRol(rol))).toThrow('Acceso denegado');
  });

  it('permite al profesional', () => {
    expect(crearGuard().canActivate(contextoConRol(Rol.PROFESIONAL))).toBe(true);
  });
});
