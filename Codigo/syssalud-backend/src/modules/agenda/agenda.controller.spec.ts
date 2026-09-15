import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Rol } from '@syssalud/shared-types';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';

/** AGE-031: wiring de RBAC del controller (los casos de negocio ya se cubren en agenda.service.spec.ts). */
describe('AgendaController', () => {
  let controller: AgendaController;
  const agendaService = {
    estado: jest.fn(),
    agendaDe: jest.fn(),
    disponibilidad: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgendaController],
      providers: [
        { provide: AgendaService, useValue: agendaService },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<AgendaController>(AgendaController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /agenda/:profesionalId admite PROFESIONAL y ASISTENTE', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AgendaController.prototype.agendaDe,
    );
    expect(roles).toEqual([Rol.PROFESIONAL, Rol.ASISTENTE]);
  });

  it('GET /agenda/mi-agenda es sólo para PROFESIONAL', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AgendaController.prototype.miAgenda,
    );
    expect(roles).toEqual([Rol.PROFESIONAL]);
  });

  it('agendaDe delega en el service con el :profesionalId, la query y el usuario autenticado', () => {
    const req = {
      user: { sub: 'u1', rol: Rol.ASISTENTE, email: 'a@a.com', nombre: 'A' },
    } as any;
    const query = { desde: '2026-09-14', hasta: '2026-09-18' };
    controller.agendaDe('p1', query, req);
    expect(agendaService.agendaDe).toHaveBeenCalledWith('p1', query, req.user);
  });

  it('miAgenda delega usando el sub del usuario autenticado', () => {
    const req = {
      user: { sub: 'yo', rol: Rol.PROFESIONAL, email: 'p@p.com', nombre: 'P' },
    } as any;
    const query = { desde: '2026-09-14', hasta: '2026-09-18' };
    controller.miAgenda(req, query);
    expect(agendaService.agendaDe).toHaveBeenCalledWith('yo', query, req.user);
  });

  it('disponibilidad delega en el service sin restricción de rol', () => {
    const query = {
      servicioId: 's1',
      desde: '2026-09-14',
      hasta: '2026-09-18',
    };
    controller.disponibilidad('p1', query);
    expect(agendaService.disponibilidad).toHaveBeenCalledWith('p1', query);
  });
});
