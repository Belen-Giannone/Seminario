import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';
import { TurnosController } from './turnos.controller';

function rolesDe(metodo: keyof TurnosController): Rol[] | undefined {
  const reflector = new Reflector();
  return reflector.get<Rol[]>(ROLES_KEY, TurnosController.prototype[metodo] as unknown as () => void);
}

describe('TurnosController — RBAC (TUR-035)', () => {
  it('solicitar: PACIENTE + ASISTENTE', () => {
    expect(rolesDe('solicitar')).toEqual([Rol.PACIENTE, Rol.ASISTENTE]);
  });

  it('pagar: PACIENTE + ASISTENTE', () => {
    expect(rolesDe('pagar')).toEqual([Rol.PACIENTE, Rol.ASISTENTE]);
  });

  it('cancelar: PACIENTE + ASISTENTE', () => {
    expect(rolesDe('cancelar')).toEqual([Rol.PACIENTE, Rol.ASISTENTE]);
  });

  it('reprogramar: PACIENTE + ASISTENTE', () => {
    expect(rolesDe('reprogramar')).toEqual([Rol.PACIENTE, Rol.ASISTENTE]);
  });

  it('marcarAsistencia: PROFESIONAL + ASISTENTE', () => {
    expect(rolesDe('marcarAsistencia')).toEqual([Rol.PROFESIONAL, Rol.ASISTENTE]);
  });

  it('misTurnos: sólo PACIENTE', () => {
    expect(rolesDe('misTurnos')).toEqual([Rol.PACIENTE]);
  });

  it('listar/obtener: sin @Roles (filtrado por rol dentro del service)', () => {
    expect(rolesDe('listar')).toBeUndefined();
    expect(rolesDe('obtener')).toBeUndefined();
  });

  describe('delegación al service con el usuario autenticado', () => {
    let service: any;
    let controller: TurnosController;
    const req = { user: { sub: 'usr-1', rol: Rol.PACIENTE } } as any;

    beforeEach(() => {
      service = {
        solicitar: jest.fn(),
        pagar: jest.fn(),
        cancelar: jest.fn(),
        reprogramar: jest.fn(),
        obtener: jest.fn(),
        listar: jest.fn(),
        misTurnos: jest.fn(),
        marcarAsistencia: jest.fn(),
      };
      controller = new TurnosController(service);
    });

    it('nunca toma el pacienteId del body cuando filtra: pasa siempre el sub del token', () => {
      controller.listar({}, req);
      expect(service.listar).toHaveBeenCalledWith({}, { sub: 'usr-1', rol: Rol.PACIENTE });
    });

    it('obtener usa el id de la URL y el usuario del token, no del body', () => {
      controller.obtener('t-1', req);
      expect(service.obtener).toHaveBeenCalledWith('t-1', { sub: 'usr-1', rol: Rol.PACIENTE });
    });
  });
});
