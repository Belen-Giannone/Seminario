/* eslint-disable @typescript-eslint/unbound-method -- se verifican mocks de jest */
import { HttpException, NotFoundException } from '@nestjs/common';
import { EstadoTurno, Rol } from '@syssalud/shared-types';
import { AgendaService } from './agenda.service';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ServiciosClient } from './clients/servicios.client';
import { FeriadosClient } from './clients/feriados.client';
import { PacientesClient } from './clients/pacientes.client';

const SEMANA = { desde: '2026-09-14', hasta: '2026-09-18' };

describe('AgendaService', () => {
  let profesionalesClient: jest.Mocked<ProfesionalesClient>;
  let turnosClient: jest.Mocked<TurnosClient>;
  let serviciosClient: jest.Mocked<ServiciosClient>;
  let feriadosClient: jest.Mocked<FeriadosClient>;
  let pacientesClient: jest.Mocked<PacientesClient>;
  let service: AgendaService;

  beforeEach(() => {
    profesionalesClient = {
      existe: jest
        .fn()
        .mockResolvedValue({ estado: 'si', nombre: 'Carlos Bilardo' }),
      horariosDe: jest.fn(),
      idPorUsuario: jest.fn(),
    } as unknown as jest.Mocked<ProfesionalesClient>;
    turnosClient = {
      ocupacion: jest.fn().mockResolvedValue({ turnos: [], parcial: false }),
    } as unknown as jest.Mocked<TurnosClient>;
    serviciosClient = {
      obtener: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ServiciosClient>;
    feriadosClient = {
      enRango: jest.fn(),
      deAnio: jest.fn(),
    } as unknown as jest.Mocked<FeriadosClient>;
    pacientesClient = {
      nombres: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<PacientesClient>;
    service = new AgendaService(
      profesionalesClient,
      turnosClient,
      serviciosClient,
      feriadosClient,
      pacientesClient,
    );
  });

  describe('agendaDe (CUU05)', () => {
    it('lanza 404 si el profesional no está registrado (alt. 1.b)', async () => {
      profesionalesClient.existe.mockResolvedValue({ estado: 'no' });

      await expect(
        service.agendaDe('p1', SEMANA, { sub: 'u1', rol: Rol.ASISTENTE }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('un PROFESIONAL ve la agenda de SU profesional (resuelto desde el usuario), no la del :profesionalId', async () => {
      profesionalesClient.idPorUsuario.mockResolvedValue('prof-de-yo');

      const resultado = await service.agendaDe('otro-profesional-id', SEMANA, {
        sub: 'usuario-yo',
        rol: Rol.PROFESIONAL,
      });

      expect(profesionalesClient.idPorUsuario).toHaveBeenCalledWith(
        'usuario-yo',
      );
      expect(profesionalesClient.existe).toHaveBeenCalledWith('prof-de-yo');
      expect(resultado.idProf).toBe('prof-de-yo');
    });

    it('404 si el usuario PROFESIONAL no tiene perfil de profesional', async () => {
      profesionalesClient.idPorUsuario.mockResolvedValue(null);

      await expect(
        service.agendaDe('x', SEMANA, { sub: 'u1', rol: Rol.PROFESIONAL }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('424 si Profesionales no responde al resolver el profesional del usuario', async () => {
      profesionalesClient.idPorUsuario.mockResolvedValue(undefined);

      await expect(
        service.agendaDe('x', SEMANA, { sub: 'u1', rol: Rol.PROFESIONAL }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('un ASISTENTE puede consultar cualquier profesional', async () => {
      const resultado = await service.agendaDe('p1', SEMANA, {
        sub: 'asistente-1',
        rol: Rol.ASISTENTE,
      });

      expect(profesionalesClient.existe).toHaveBeenCalledWith('p1');
      expect(resultado.idProf).toBe('p1');
      expect(resultado.profesionalNombre).toBe('Carlos Bilardo');
    });

    it('completa paciente y servicio de cada turno; sin dato queda en null', async () => {
      turnosClient.ocupacion.mockResolvedValue({
        turnos: [
          {
            idTurno: 't1',
            fecha: '2026-09-14',
            hora: '09:00',
            estado: EstadoTurno.CONFIRMADO,
            pacienteId: 'pa1',
            servicioId: 's1',
          },
          {
            idTurno: 't2',
            fecha: '2026-09-15',
            hora: '10:00',
            estado: EstadoTurno.CONFIRMADO,
            pacienteId: 'pa2',
            servicioId: 's1',
          },
        ],
        parcial: false,
      });
      pacientesClient.nombres.mockResolvedValue(
        new Map([['pa1', 'Ana Gómez']]),
      );
      serviciosClient.obtener.mockResolvedValue({
        duracionMin: 30,
        nombre: 'Consulta',
      });

      const { items } = await service.agendaDe('p1', SEMANA, {
        sub: 'a',
        rol: Rol.ASISTENTE,
      });

      expect(items).toEqual([
        {
          idTurno: 't1',
          fecha: '2026-09-14',
          hora: '09:00',
          estado: 'CONFIRMADO',
          pacienteNombre: 'Ana Gómez',
          servicioNombre: 'Consulta',
        },
        {
          idTurno: 't2',
          fecha: '2026-09-15',
          hora: '10:00',
          estado: 'CONFIRMADO',
          pacienteNombre: null,
          servicioNombre: 'Consulta',
        },
      ]);
      // Un solo pedido por servicio distinto.
      expect(serviciosClient.obtener).toHaveBeenCalledTimes(1);
    });

    it('devuelve el mensaje de alt. 1.a cuando no hay turnos', async () => {
      const resultado = await service.agendaDe('p1', SEMANA, {
        sub: 'a1',
        rol: Rol.ASISTENTE,
      });

      expect(resultado.mensaje).toBe('No existen turnos en la agenda.');
    });

    it('cachea el resultado: una segunda consulta idéntica no vuelve a golpear las costuras (AGE-019)', async () => {
      const user = { sub: 'a1', rol: Rol.ASISTENTE };
      await service.agendaDe('p1', SEMANA, user);
      await service.agendaDe('p1', SEMANA, user);

      expect(turnosClient.ocupacion).toHaveBeenCalledTimes(1);
    });
  });

  describe('disponibilidad (AGE-013)', () => {
    const horarioLunes = [
      {
        id: 'h1',
        profesionalId: 'p1',
        diaSemana: 1,
        horaInicio: '09:00',
        horaFin: '09:30',
      },
    ];

    beforeEach(() => {
      feriadosClient.enRango.mockResolvedValue(new Set());
    });

    it('usa el bloque de agenda por defecto si Servicios no responde (AGE-002)', async () => {
      profesionalesClient.horariosDe.mockResolvedValue(horarioLunes);

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

    it('acepta `fecha` (un solo día) como la consulta Turnos, y descuenta los ocupados (RN09)', async () => {
      profesionalesClient.horariosDe.mockResolvedValue(horarioLunes);
      turnosClient.ocupacion.mockResolvedValue({
        turnos: [
          {
            idTurno: 't1',
            fecha: '2026-09-14',
            hora: '09:00',
            estado: EstadoTurno.CONFIRMADO,
          },
        ],
        parcial: false,
      });

      const slots = await service.disponibilidad('p1', {
        servicioId: 's1',
        fecha: '2026-09-14',
      });

      expect(turnosClient.ocupacion).toHaveBeenCalledWith(
        'p1',
        '2026-09-14',
        '2026-09-14',
      );
      expect(slots).toEqual([{ fecha: '2026-09-14', hora: '09:15' }]);
    });

    it('descuenta la duración completa de los turnos tomados según su servicio', async () => {
      profesionalesClient.horariosDe.mockResolvedValue([
        {
          id: 'h1',
          profesionalId: 'p1',
          diaSemana: 1,
          horaInicio: '09:00',
          horaFin: '10:00',
        },
      ]);
      turnosClient.ocupacion.mockResolvedValue({
        turnos: [
          {
            idTurno: 't1',
            fecha: '2026-09-14',
            hora: '09:00',
            estado: EstadoTurno.CONFIRMADO,
            servicioId: 'largo',
          },
        ],
        parcial: false,
      });
      serviciosClient.obtener.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'largo' ? { duracionMin: 45, nombre: 'Peeling' } : null,
        ),
      );

      const slots = await service.disponibilidad('p1', {
        servicioId: 's1',
        fecha: '2026-09-14',
      });

      expect(slots).toEqual([{ fecha: '2026-09-14', hora: '09:45' }]);
    });

    it('sin horarios del profesional, la disponibilidad queda vacía (RN19)', async () => {
      profesionalesClient.horariosDe.mockResolvedValue(null);

      const slots = await service.disponibilidad('p1', {
        servicioId: 's1',
        desde: '2026-09-14',
        hasta: '2026-09-14',
      });

      expect(slots).toEqual([]);
    });
  });
});
