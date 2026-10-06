/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method -- mocks tipados `any` a propósito (jest.fn); Reflector.get sólo lee metadata, no invoca el método */
import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../shared/guards/jwt-auth.guard';
import { ProfesionalesController } from './profesionales.controller';

function rolesDe(metodo: keyof ProfesionalesController): Rol[] | undefined {
  const reflector = new Reflector();
  return reflector.get<Rol[]>(
    ROLES_KEY,
    ProfesionalesController.prototype[metodo],
  );
}

describe('ProfesionalesController — RBAC (PRO-025)', () => {
  it('crear (alta): ASISTENTE + DUENO', () => {
    expect(rolesDe('crear')).toEqual([Rol.ASISTENTE, Rol.DUENO]);
  });

  it('definirHorarios: ASISTENTE + DUENO + el propio PROFESIONAL', () => {
    expect(rolesDe('definirHorarios')).toEqual([
      Rol.ASISTENTE,
      Rol.DUENO,
      Rol.PROFESIONAL,
    ]);
  });

  it('actualizar (edición/baja): ASISTENTE + DUENO', () => {
    expect(rolesDe('actualizar')).toEqual([Rol.ASISTENTE, Rol.DUENO]);
  });

  it('listar/buscarPorId/horariosDe/porUsuario: sin @Roles (cualquier autenticado)', () => {
    expect(rolesDe('listar')).toBeUndefined();
    expect(rolesDe('buscarPorId')).toBeUndefined();
    expect(rolesDe('horariosDe')).toBeUndefined();
    expect(rolesDe('porUsuario')).toBeUndefined();
  });

  describe('delegación al service', () => {
    let service: any;
    let controller: ProfesionalesController;
    const req = {
      user: { sub: 'usr-1', rol: Rol.PROFESIONAL },
    } as unknown as AuthenticatedRequest;

    beforeEach(() => {
      service = {
        definirHorarios: jest.fn(),
        listar: jest.fn(),
      };
      controller = new ProfesionalesController(service);
    });

    it('definirHorarios pasa el usuario del token, no uno del body', () => {
      void controller.definirHorarios('prof-1', { horarios: [] }, req);
      expect(service.definirHorarios).toHaveBeenCalledWith(
        'prof-1',
        { horarios: [] },
        { sub: 'usr-1', rol: Rol.PROFESIONAL },
      );
    });

    it('listar separa ids por coma y convierte activos a boolean', () => {
      void controller.listar('a,b,c', 'true');
      expect(service.listar).toHaveBeenCalledWith({
        ids: ['a', 'b', 'c'],
        activos: true,
      });
    });
  });
});
