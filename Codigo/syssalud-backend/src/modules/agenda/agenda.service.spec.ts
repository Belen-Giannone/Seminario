import { NotFoundException } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { AgendaService } from './agenda.service';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ServiciosClient } from './clients/servicios.client';
import { FeriadosClient } from './clients/feriados.client';

describe('AgendaService', () => {
  let profesionalesClient: jest.Mocked<ProfesionalesClient>;
  let turnosClient: jest.Mocked<TurnosClient>;
  let serviciosClient: jest.Mocked<ServiciosClient>;
  let feriadosClient: jest.Mocked<FeriadosClient>;
  let service: AgendaService;

  beforeEach(() => {
    profesionalesClient = {
      existe: jest.fn(),
      horariosDe: jest.fn(),
    } as unknown as jest.Mocked<ProfesionalesClient>;
    turnosClient = {
      ocupacion: jest.fn(),
    } as unknown as jest.Mocked<TurnosClient>;
    serviciosClient = {
      obtener: jest.fn(),
    } as unknown as jest.Mocked<ServiciosClient>;
    feriadosClient = {
      enRango: jest.fn(),
      deAnio: jest.fn(),
    } as unknown as jest.Mocked<FeriadosClient>;
    service = new AgendaService(
      profesionalesClient,
      turnosClient,
      serviciosClient,
      feriadosClient,
    );
  });

  describe('agendaDe (CUU05)', () => {
    it('lanza 404 si el profesional no está registrado (alt. 1.b)', async () => {
      profesionalesClient.existe.mockResolvedValue('no');

      await expect(
        service.agendaDe(
          'p1',
          { desde: '2026-09-14', hasta: '2026-09-18' },
          { sub: 'u1', rol: Rol.ASISTENTE },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('un PROFESIONAL sólo ve su propia agenda: se ignora el :profesionalId de la ruta', async () => {
      profesionalesClient.existe.mockResolvedValue('si');
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });

      const resultado = await service.agendaDe(
        'otro-profesional-id',
        { desde: '2026-09-14', hasta: '2026-09-18' },
        { sub: 'yo-mismo', rol: Rol.PROFESIONAL },
      );

      expect(profesionalesClient.existe).toHaveBeenCalledWith('yo-mismo');
      expect(resultado.idProf).toBe('yo-mismo');
    });

    it('un ASISTENTE puede consultar cualquier profesional', async () => {
      profesionalesClient.existe.mockResolvedValue('si');
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });

      const resultado = await service.agendaDe(
        'p1',
        { desde: '2026-09-14', hasta: '2026-09-18' },
        { sub: 'asistente-1', rol: Rol.ASISTENTE },
      );

      expect(profesionalesClient.existe).toHaveBeenCalledWith('p1');
      expect(resultado.idProf).toBe('p1');
    });

    it('devuelve el mensaje de alt. 1.a cuando no hay turnos', async () => {
      profesionalesClient.existe.mockResolvedValue('si');
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });

      const resultado = await service.agendaDe(
        'p1',
        { desde: '2026-09-14', hasta: '2026-09-18' },
        { sub: 'a1', rol: Rol.ASISTENTE },
      );

      expect(resultado.mensaje).toBe('No existen turnos en la agenda.');
    });

    it('cachea el resultado: una segunda consulta idéntica no vuelve a golpear las costuras (AGE-019)', async () => {
      profesionalesClient.existe.mockResolvedValue('si');
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });

      const query = { desde: '2026-09-14', hasta: '2026-09-18' };
      const user = { sub: 'a1', rol: Rol.ASISTENTE };
      await service.agendaDe('p1', query, user);
      await service.agendaDe('p1', query, user);

      expect(turnosClient.ocupacion).toHaveBeenCalledTimes(1);
    });
  });

  describe('disponibilidad (AGE-013)', () => {
    it('usa el bloque de agenda por defecto si Servicios no responde (AGE-002)', async () => {
      profesionalesClient.horariosDe.mockResolvedValue([
        { diaSemana: 1, horaInicio: '09:00', horaFin: '09:30' },
      ]);
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });
      feriadosClient.enRango.mockResolvedValue(new Set());
      serviciosClient.obtener.mockResolvedValue(null);

      const slots = await service.disponibilidad('p1', {
        servicioId: 's1',
        desde: '2026-09-14',
        hasta: '2026-09-14',
      });

      // bloque por defecto = 15min -> 2 slots en la franja de 30min.
      expect(slots).toEqual([
        { fecha: '2026-09-14', hora: '09:00' },
        { fecha: '2026-09-14', hora: '09:15' },
      ]);
    });

    it('sin horarios del profesional, la disponibilidad queda vacía (RN19)', async () => {
      profesionalesClient.horariosDe.mockResolvedValue(null);
      turnosClient.ocupacion.mockResolvedValue({ items: [], parcial: false });
      feriadosClient.enRango.mockResolvedValue(new Set());
      serviciosClient.obtener.mockResolvedValue({ duracionMin: 15 });

      const slots = await service.disponibilidad('p1', {
        servicioId: 's1',
        desde: '2026-09-14',
        hasta: '2026-09-14',
      });

      expect(slots).toEqual([]);
    });
  });
});
