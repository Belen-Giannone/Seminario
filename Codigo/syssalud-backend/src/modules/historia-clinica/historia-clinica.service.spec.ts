import {
  BadRequestException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { fechaLocal, HistoriaClinicaService } from './historia-clinica.service';

const PACIENTE_ID = '11111111-1111-1111-1111-111111111111';
const PROFESIONAL_ID = '33333333-3333-3333-3333-333333333333';
const AUTH = 'Bearer token-profesional';

const paciente = {
  id: PACIENTE_ID,
  nombre: 'Juana',
  apellido: 'Pérez',
  telefono: '3411234567',
  email: 'juana@syssalud.com',
};

function crearService(
  opciones: {
    modo?: 'lenient' | 'strict';
    historia?: { id: string; pacienteId: string } | null;
  } = {},
) {
  const historias = {
    findOne: jest.fn().mockResolvedValue(opciones.historia ?? null),
    create: jest.fn((data: object) => ({ ...data })),
    save: jest.fn((data: object) =>
      Promise.resolve({ id: 'historia-1', ...data }),
    ),
  };
  const entradas = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((data: object) => ({ ...data })),
    save: jest.fn((data: object) =>
      Promise.resolve({
        id: 'entrada-1',
        fechaActualizacion: new Date('2026-10-05T15:00:00Z'),
        ...data,
      }),
    ),
  };
  const pacientesClient = {
    buscar: jest.fn(),
    obtener: jest.fn().mockResolvedValue(paciente),
    disponible: jest.fn(),
  };
  const turnosClient = {
    turnosAsistidos: jest.fn().mockResolvedValue([]),
    disponible: jest.fn(),
  };
  const config = {
    get: jest.fn((clave: string) =>
      clave === 'HISTORIA_VALIDAR_TURNOS'
        ? (opciones.modo ?? 'lenient')
        : undefined,
    ),
  };
  const service = new HistoriaClinicaService(
    historias as never,
    entradas as never,
    pacientesClient as never,
    turnosClient as never,
    config as never,
  );
  return { service, historias, entradas, pacientesClient, turnosClient };
}

const entradaValida = {
  observaciones: 'Control',
  antecedentes: '',
  tratamientos: '',
};

describe('HistoriaClinicaService', () => {
  describe('buscar', () => {
    it('sin coincidencias responde 404 con el mensaje del diccionario', async () => {
      const { service, pacientesClient } = crearService();
      pacientesClient.buscar.mockResolvedValue([]);

      await expect(
        service.buscar({ dni: '30111222' }, PROFESIONAL_ID, AUTH),
      ).rejects.toThrow(
        new NotFoundException(
          'No se encontraron pacientes con los criterios ingresados.',
        ),
      );
    });

    it('sin criterio responde 400', async () => {
      const { service } = crearService();

      await expect(
        service.buscar({ nombre: 'Juana' }, PROFESIONAL_ID, AUTH),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('por DNI se queda con la coincidencia exacta y devuelve su HC', async () => {
      const { service, pacientesClient } = crearService({
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });
      pacientesClient.buscar.mockResolvedValue([
        {
          id: PACIENTE_ID,
          numeroPaciente: 1,
          nombreCompleto: 'Juana Pérez',
          dni: '30111222',
        },
        {
          id: 'otro',
          numeroPaciente: 2,
          nombreCompleto: 'Ana Gómez',
          dni: '301112229',
        },
      ]);

      const resultado = await service.buscar(
        { dni: '30111222' },
        PROFESIONAL_ID,
        AUTH,
      );

      expect(resultado).toMatchObject({
        pacienteId: PACIENTE_ID,
        nomAppPac: 'Juana Pérez',
      });
      expect(pacientesClient.buscar).toHaveBeenCalledWith('30111222', AUTH);
    });

    it('por nombre y apellido filtra sin distinguir acentos ni mayúsculas', async () => {
      const { service, pacientesClient } = crearService();
      pacientesClient.buscar.mockResolvedValue([
        {
          id: PACIENTE_ID,
          numeroPaciente: 1,
          nombreCompleto: 'Juana Pérez',
          dni: '1',
        },
        {
          id: 'otro',
          numeroPaciente: 2,
          nombreCompleto: 'Carlos Pérez',
          dni: '2',
        },
      ]);

      const resultado = await service.buscar(
        { nombre: 'juana', apellido: 'perez' },
        PROFESIONAL_ID,
        AUTH,
      );

      expect(pacientesClient.buscar).toHaveBeenCalledWith('perez', AUTH);
      expect(resultado).toEqual({ existe: false, pacienteId: PACIENTE_ID });
    });

    it('con varias coincidencias devuelve la lista para desambiguar', async () => {
      const { service, pacientesClient } = crearService();
      const lista = [
        { id: 'a', numeroPaciente: 1, nombreCompleto: 'Juana Pérez', dni: '1' },
        { id: 'b', numeroPaciente: 2, nombreCompleto: 'Juana Pérez', dni: '2' },
      ];
      pacientesClient.buscar.mockResolvedValue(lista);

      await expect(
        service.buscar(
          { nombre: 'Juana', apellido: 'Pérez' },
          PROFESIONAL_ID,
          AUTH,
        ),
      ).resolves.toEqual(lista);
    });

    it('si Pacientes no responde: 503 en lenient y 424 en strict', async () => {
      const lenient = crearService();
      lenient.pacientesClient.buscar.mockRejectedValue(new Error('timeout'));
      await expect(
        lenient.service.buscar({ dni: '30111222' }, PROFESIONAL_ID, AUTH),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);

      const strict = crearService({ modo: 'strict' });
      strict.pacientesClient.buscar.mockRejectedValue(new Error('timeout'));
      await expect(
        strict.service.buscar({ dni: '30111222' }, PROFESIONAL_ID, AUTH),
      ).rejects.toMatchObject({ status: 424 });
    });
  });

  describe('obtener', () => {
    it('404 si Pacientes confirma que el paciente no existe', async () => {
      const { service, pacientesClient } = crearService();
      pacientesClient.obtener.mockResolvedValue(null);

      await expect(
        service.obtener(PACIENTE_ID, PROFESIONAL_ID, AUTH),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('si Pacientes no responde sirve la HC con datos personales nulos (lenient)', async () => {
      const { service, pacientesClient } = crearService({
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });
      pacientesClient.obtener.mockRejectedValue(new Error('timeout'));

      await expect(
        service.obtener(PACIENTE_ID, PROFESIONAL_ID, AUTH),
      ).resolves.toMatchObject({ pacienteId: PACIENTE_ID, nomAppPac: null });
    });
  });

  describe('inicializar', () => {
    it('es idempotente', async () => {
      const { service, historias } = crearService();
      historias.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'historia-1', pacienteId: PACIENTE_ID });

      await service.inicializar(PACIENTE_ID, PROFESIONAL_ID, AUTH);
      await service.inicializar(PACIENTE_ID, PROFESIONAL_ID, AUTH);

      expect(historias.save).toHaveBeenCalledTimes(1);
    });

    it('no crea HC para un paciente inexistente', async () => {
      const { service, historias, pacientesClient } = crearService();
      pacientesClient.obtener.mockResolvedValue(null);

      await expect(
        service.inicializar(PACIENTE_ID, PROFESIONAL_ID, AUTH),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(historias.save).not.toHaveBeenCalled();
    });
  });

  describe('agregarEntrada', () => {
    it('rechaza con 400 una entrada sin contenido clínico', async () => {
      const { service } = crearService();

      await expect(
        service.agregarEntrada(
          PACIENTE_ID,
          PROFESIONAL_ID,
          { observaciones: ' ', antecedentes: '', tratamientos: '' },
          AUTH,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('setea autor (sub) y asocia el turno asistido más reciente', async () => {
      const { service, entradas, turnosClient } = crearService({
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });
      turnosClient.turnosAsistidos.mockResolvedValue([
        { idTurno: 'turno-viejo', fecha: '2026-03-01' },
        { idTurno: 'turno-nuevo', fecha: '2026-09-14' },
      ]);

      const entrada = await service.agregarEntrada(
        PACIENTE_ID,
        PROFESIONAL_ID,
        entradaValida,
        AUTH,
      );

      expect(entradas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          profesionalId: PROFESIONAL_ID,
          turnoId: 'turno-nuevo',
          historiaId: 'historia-1',
        }),
      );
      expect(entrada.idTurno).toBe('turno-nuevo');
      expect(entrada.fechaActualizacion).toBe('2026-10-05T15:00:00.000Z');
    });

    it('en strict devuelve 424 si no hay turno asistido', async () => {
      const { service } = crearService({
        modo: 'strict',
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });

      await expect(
        service.agregarEntrada(
          PACIENTE_ID,
          PROFESIONAL_ID,
          entradaValida,
          AUTH,
        ),
      ).rejects.toMatchObject({ status: 424 });
    });

    it('en strict devuelve 424 si Turnos no responde', async () => {
      const { service, turnosClient } = crearService({
        modo: 'strict',
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });
      turnosClient.turnosAsistidos.mockRejectedValue(new Error('timeout'));

      await expect(
        service.agregarEntrada(
          PACIENTE_ID,
          PROFESIONAL_ID,
          entradaValida,
          AUTH,
        ),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('en lenient registra con turno nulo si Turnos no responde', async () => {
      const { service, turnosClient } = crearService({
        historia: { id: 'historia-1', pacienteId: PACIENTE_ID },
      });
      turnosClient.turnosAsistidos.mockRejectedValue(new Error('timeout'));

      await expect(
        service.agregarEntrada(
          PACIENTE_ID,
          PROFESIONAL_ID,
          entradaValida,
          AUTH,
        ),
      ).resolves.toMatchObject({ idTurno: null });
    });
  });

  describe('fechaLocal', () => {
    it('usa el día de Argentina y no el de UTC', () => {
      // 01:30 UTC del 6/10 = 22:30 del 5/10 en Buenos Aires.
      expect(fechaLocal(new Date('2026-10-06T01:30:00Z'))).toBe('2026-10-05');
    });
  });
});
