import { BadRequestException, ConflictException, ForbiddenException, HttpException } from '@nestjs/common';
import { EstadoPago, EstadoTurno, MetodoPago, Rol } from '@syssalud/shared-types';
import { TurnosService } from './turnos.service';

/** Formatea en hora LOCAL — así coincide con cómo `verificarPlazo` parsea `fecha`+`hora`. */
function fechaHoraLocal(d: Date): { fecha: string; hora: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function crearTurno(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 't-1',
    pacienteId: 'pac-1',
    profesionalId: 'prof-1',
    servicioId: 'serv-1',
    fecha: '2026-11-10',
    hora: '10:00',
    estado: EstadoTurno.SOLICITADO,
    monto: 5000,
    pagoId: null,
    comprobanteNumero: null,
    reservaExpiraEn: null,
    creadoPor: 'usr-1',
    origen: 'PACIENTE',
    motivoCancelacion: null,
    idTransaccion: null,
    ...overrides,
  };
}

describe('TurnosService', () => {
  let turnosRepo: any;
  let dataSource: any;
  let pacientesClient: any;
  let serviciosClient: any;
  let profesionalesClient: any;
  let agendaClient: any;
  let pagosClient: any;
  let notificacionesClient: any;
  let config: any;
  let service: TurnosService;
  let managerRepo: any;

  beforeEach(() => {
    managerRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: any) => ({ ...data })),
      save: jest.fn((t: any) => Promise.resolve(t)),
    };
    turnosRepo = {
      findOne: jest.fn(),
      save: jest.fn((t: any) => Promise.resolve(t)),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(async (cb: any) =>
        cb({ getRepository: () => managerRepo, query: jest.fn().mockResolvedValue(undefined) }),
      ),
    };
    pacientesClient = {
      estaRegistrado: jest.fn().mockResolvedValue(true),
      porUsuario: jest.fn().mockResolvedValue({ id: 'pac-1' }),
      buscar: jest.fn().mockResolvedValue([]),
    };
    serviciosClient = {
      obtener: jest.fn().mockResolvedValue({ nombre: 'Consulta', duracionMin: 30, precio: 5000, activo: true }),
      profesionalesDe: jest.fn().mockResolvedValue([]),
    };
    profesionalesClient = { existe: jest.fn().mockResolvedValue('si') };
    agendaClient = { disponibilidad: jest.fn().mockResolvedValue([{ hora: '10:00' }]) };
    pagosClient = {
      procesar: jest.fn().mockResolvedValue({ estado: EstadoPago.APROBADO, pagoId: 'pago-1', comprobanteNumero: 'CMP-1' }),
      ajustarReembolso: jest.fn().mockResolvedValue(undefined),
    };
    notificacionesClient = { enviar: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn((_key: string, fallback: unknown) => fallback) };

    service = new TurnosService(
      turnosRepo,
      dataSource,
      pacientesClient,
      serviciosClient,
      profesionalesClient,
      agendaClient,
      pagosClient,
      notificacionesClient,
      config,
    );
  });

  describe('solicitar (TUR-013)', () => {
    const dto = { servicioId: 'serv-1', profesionalId: 'prof-1', fecha: '2026-11-10', hora: '10:00' };
    const solicitantePaciente = { sub: 'usr-1', rol: Rol.PACIENTE };

    it('crea el turno en SOLICITADO con el monto del servicio', async () => {
      const { turno, liquidacion } = await service.solicitar(dto, solicitantePaciente);
      expect(turno.estado).toBe(EstadoTurno.SOLICITADO);
      expect(turno.monto).toBe(5000);
      expect(liquidacion.monto).toBe(5000);
    });

    it('RN06: rechaza si el paciente no está registrado', async () => {
      pacientesClient.estaRegistrado.mockResolvedValue(false);
      await expect(service.solicitar(dto, solicitantePaciente)).rejects.toThrow(BadRequestException);
    });

    it('RN19/TUR-013 3.a: rechaza si Agenda no ofrece ese horario', async () => {
      agendaClient.disponibilidad.mockResolvedValue([{ hora: '11:00' }]);
      await expect(service.solicitar(dto, solicitantePaciente)).rejects.toThrow(ConflictException);
    });

    it('TUR-010: rechaza si ya hay un turno vigente en ese slot', async () => {
      managerRepo.findOne.mockResolvedValue(crearTurno({ estado: EstadoTurno.CONFIRMADO }));
      await expect(service.solicitar(dto, solicitantePaciente)).rejects.toThrow(ConflictException);
    });

    it('ASISTENTE debe indicar pacienteId', async () => {
      await expect(
        service.solicitar(dto, { sub: 'asis-1', rol: Rol.ASISTENTE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TUR-002 lenient: si Servicios degrada, usa monto 0 sin bloquear', async () => {
      serviciosClient.obtener.mockResolvedValue(null);
      const { turno } = await service.solicitar(dto, solicitantePaciente);
      expect(turno.monto).toBe(0);
    });
  });

  describe('pagar (TUR-014)', () => {
    const dtoPago = { metodoPago: MetodoPago.TARJETA, idTransaccion: 'tx-1' };
    const solicitante = { sub: 'usr-1', rol: Rol.PACIENTE };

    it('aprobado: confirma el turno y guarda comprobante', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno());
      const turno = await service.pagar('t-1', dtoPago, solicitante);
      expect(turno.estado).toBe(EstadoTurno.CONFIRMADO);
      expect(turno.comprobanteNumero).toBe('CMP-1');
      expect(notificacionesClient.enviar).toHaveBeenCalled();
    });

    it('RN20: rechazado libera el slot (NO_CONFIRMADO) y devuelve 402', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno());
      pagosClient.procesar.mockResolvedValue({ estado: EstadoPago.RECHAZADO, pagoId: 'pago-1' });
      await expect(service.pagar('t-1', dtoPago, solicitante)).rejects.toThrow(HttpException);
      expect(turnosRepo.save).toHaveBeenCalledWith(expect.objectContaining({ estado: EstadoTurno.NO_CONFIRMADO }));
    });

    it('TUR-002: Pagos caído deja el turno SOLICITADO con la transacción guardada', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno());
      pagosClient.procesar.mockResolvedValue(null);
      const turno = await service.pagar('t-1', dtoPago, solicitante);
      expect(turno.estado).toBe(EstadoTurno.SOLICITADO);
    });

    it('TUR-049: reintento idempotente del mismo idTransaccion ya confirmado no reprocesa', async () => {
      turnosRepo.findOne.mockResolvedValue(
        crearTurno({ estado: EstadoTurno.CONFIRMADO, idTransaccion: 'tx-1' }),
      );
      const turno = await service.pagar('t-1', dtoPago, solicitante);
      expect(turno.estado).toBe(EstadoTurno.CONFIRMADO);
      expect(pagosClient.procesar).not.toHaveBeenCalled();
    });

    it('IDOR: un PACIENTE no puede pagar el turno de otro paciente', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno({ pacienteId: 'otro-paciente' }));
      await expect(service.pagar('t-1', dtoPago, solicitante)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelar (TUR-017, RN12/RN13/RN22)', () => {
    const solicitantePaciente = { sub: 'usr-1', rol: Rol.PACIENTE };

    it('bloquea al PACIENTE con menos de 24h de anticipación', async () => {
      const { fecha, hora } = fechaHoraLocal(new Date(Date.now() + 2 * 3_600_000));
      turnosRepo.findOne.mockResolvedValue(
        crearTurno({ estado: EstadoTurno.CONFIRMADO, fecha, hora }),
      );
      await expect(service.cancelar('t-1', {}, solicitantePaciente)).rejects.toThrow(ConflictException);
    });

    it('permite a la ASISTENTE cancelar sin restricción de plazo', async () => {
      turnosRepo.findOne.mockResolvedValue(
        crearTurno({ estado: EstadoTurno.CONFIRMADO, fecha: '2026-11-10', hora: '10:00', pagoId: 'pago-1' }),
      );
      const turno = await service.cancelar('t-1', {}, { sub: 'asis-1', rol: Rol.ASISTENTE });
      expect(turno.estado).toBe(EstadoTurno.CANCELADO);
      expect(pagosClient.ajustarReembolso).toHaveBeenCalledWith('pago-1');
    });

    it('permite al PACIENTE cancelar con más de 24h de anticipación', async () => {
      const { fecha, hora } = fechaHoraLocal(new Date(Date.now() + 10 * 24 * 3_600_000));
      turnosRepo.findOne.mockResolvedValue(crearTurno({ estado: EstadoTurno.CONFIRMADO, fecha, hora }));
      const turno = await service.cancelar('t-1', {}, solicitantePaciente);
      expect(turno.estado).toBe(EstadoTurno.CANCELADO);
    });
  });

  describe('reprogramar (TUR-018)', () => {
    it('sin alternativas ofrece cancelar (2.a)', async () => {
      const enDiezDias = new Date(Date.now() + 10 * 24 * 3_600_000);
      turnosRepo.findOne.mockResolvedValue(
        crearTurno({ estado: EstadoTurno.CONFIRMADO, fecha: enDiezDias.toISOString().slice(0, 10) }),
      );
      agendaClient.disponibilidad.mockResolvedValue([]);
      await expect(
        service.reprogramar('t-1', { fecha: '2026-12-01', hora: '09:00' }, { sub: 'asis-1', rol: Rol.ASISTENTE }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('marcarAsistencia (TUR-019)', () => {
    it('rechaza si el turno no está confirmado/reprogramado', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno({ estado: EstadoTurno.CANCELADO }));
      await expect(service.marcarAsistencia('t-1')).rejects.toThrow(ConflictException);
    });

    it('marca ASISTIDO un turno confirmado', async () => {
      turnosRepo.findOne.mockResolvedValue(crearTurno({ estado: EstadoTurno.CONFIRMADO }));
      const turno = await service.marcarAsistencia('t-1');
      expect(turno.estado).toBe(EstadoTurno.ASISTIDO);
    });
  });
});
