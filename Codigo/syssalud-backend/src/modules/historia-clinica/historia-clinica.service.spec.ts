import { ConflictException, HttpException } from '@nestjs/common';
import { HistoriaClinicaService } from './historia-clinica.service';

function crearRepositorios() {
  const historias = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ id: 'historia-1', ...data })),
    save: jest.fn(async (data) => ({ id: 'historia-1', ...data })),
  };
  const entradas = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((data) => ({ id: 'entrada-1', fechaActualizacion: new Date(), ...data })),
    save: jest.fn(async (data) => ({ id: 'entrada-1', fechaActualizacion: new Date(), ...data })),
  };
  return { historias, entradas };
}

describe('HistoriaClinicaService', () => {
  afterEach(() => {
    delete process.env.HISTORIA_VALIDAR_TURNOS;
    jest.clearAllMocks();
  });

  it('inicializa de forma idempotente', async () => {
    const repositorios = crearRepositorios();
    repositorios.historias.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'historia-1', pacienteId: 'paciente-1' });
    const service = new HistoriaClinicaService(
      repositorios.historias as never,
      repositorios.entradas as never,
      { buscar: jest.fn(), obtener: jest.fn() } as never,
      { turnosAsistidos: jest.fn() } as never,
    );

    await service.inicializar('paciente-1');
    await service.inicializar('paciente-1');

    expect(repositorios.historias.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una entrada sin contenido clínico', async () => {
    const repositorios = crearRepositorios();
    const service = new HistoriaClinicaService(
      repositorios.historias as never,
      repositorios.entradas as never,
      { buscar: jest.fn(), obtener: jest.fn() } as never,
      { turnosAsistidos: jest.fn() } as never,
    );

    await expect(service.agregarEntrada('paciente-1', 'profesional-1', {
      observaciones: ' ',
      antecedentes: '',
      tratamientos: '',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('en strict devuelve 424 si no puede validar el turno', async () => {
    process.env.HISTORIA_VALIDAR_TURNOS = 'strict';
    const repositorios = crearRepositorios();
    repositorios.historias.findOne.mockResolvedValue({ id: 'historia-1', pacienteId: 'paciente-1' });
    const service = new HistoriaClinicaService(
      repositorios.historias as never,
      repositorios.entradas as never,
      { buscar: jest.fn(), obtener: jest.fn() } as never,
      { turnosAsistidos: jest.fn().mockResolvedValue([]) } as never,
    );

    try {
      await service.agregarEntrada('paciente-1', 'profesional-1', {
        observaciones: 'Control',
        antecedentes: '',
        tratamientos: '',
      });
      fail('La entrada debía rechazarse');
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(424);
    }
  });

  it('en lenient permite registrar si Turnos no responde', async () => {
    const repositorios = crearRepositorios();
    repositorios.historias.findOne.mockResolvedValue({ id: 'historia-1', pacienteId: 'paciente-1' });
    const service = new HistoriaClinicaService(
      repositorios.historias as never,
      repositorios.entradas as never,
      { buscar: jest.fn(), obtener: jest.fn() } as never,
      { turnosAsistidos: jest.fn().mockRejectedValue(new Error('timeout')) } as never,
    );

    await expect(service.agregarEntrada('paciente-1', 'profesional-1', {
      observaciones: 'Control',
      antecedentes: '',
      tratamientos: '',
    })).resolves.toMatchObject({ turnoId: null });
  });
});
