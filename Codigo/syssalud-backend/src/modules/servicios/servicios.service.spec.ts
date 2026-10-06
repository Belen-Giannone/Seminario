/* eslint-disable @typescript-eslint/unbound-method -- se verifican mocks de jest */
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ProfesionalesClient } from './clients/profesionales.client';
import { ServicioProfesional } from './entities/servicio-profesional.entity';
import { Servicio } from './entities/servicio.entity';
import { ServiciosService } from './servicios.service';

const PROF_A = '11111111-1111-4111-8111-111111111111';
const PROF_B = '22222222-2222-4222-8222-222222222222';
const SERV_ID = '44444444-4444-4444-8444-444444444444';

function servicioEntidad(parcial: Partial<Servicio> = {}): Servicio {
  return Object.assign(new Servicio(), {
    id: SERV_ID,
    nombre: 'Consulta dermatológica',
    descripcion: 'Evaluación inicial',
    duracionMin: 30,
    precio: 15000,
    activo: true,
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    actualizadoEn: new Date('2026-10-01T12:00:00Z'),
    servicioProfesionales: [
      { servicioId: SERV_ID, profesionalId: PROF_A } as ServicioProfesional,
    ],
    ...parcial,
  });
}

function crearService(
  opciones: { nombreTomado?: boolean; modo?: 'lenient' | 'strict' } = {},
) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn().mockResolvedValue(opciones.nombreTomado ?? false),
  };
  const servicios = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(servicioEntidad()),
    save: jest.fn((s: Servicio) => Promise.resolve(s)),
    createQueryBuilder: jest.fn(() => qb),
  };
  const tx = {
    create: jest.fn((_entidad: unknown, datos: object) => ({ ...datos })),
    save: jest.fn((datos: unknown) =>
      Promise.resolve(
        Array.isArray(datos) ? datos : { id: SERV_ID, ...(datos as object) },
      ),
    ),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const profesionalesClient = {
    modoValidacion: opciones.modo ?? 'lenient',
    resumenPorIds: jest.fn((ids: string[]) =>
      Promise.resolve(
        ids.map((id) => ({
          id,
          nombreCompleto: `Prof ${id.slice(0, 4)}`,
          especialidad: 'X',
          activo: true,
        })),
      ),
    ),
    existenYSonProfesionales: jest.fn((ids: string[]) =>
      Promise.resolve({
        verificado: true,
        validos: ids,
        invalidos: [] as string[],
      }),
    ),
    disponible: jest.fn().mockResolvedValue(true),
  } as unknown as jest.Mocked<ProfesionalesClient>;

  const turnosClient = { turnosFuturos: jest.fn().mockResolvedValue(0) };

  const service = new ServiciosService(
    servicios as never,
    {} as never,
    profesionalesClient,
    dataSource as never,
    turnosClient as never,
  );
  return { service, servicios, qb, tx, profesionalesClient, turnosClient };
}

const alta = {
  nombre: 'Peeling químico',
  descripcion: 'Renovación de la piel',
  duracionMin: 45,
  precio: 25000,
  profesionalIds: [PROF_A, PROF_B],
};

describe('ServiciosService', () => {
  describe('crear (SER-014)', () => {
    it('guarda el servicio y sus profesionales en una transacción', async () => {
      const { service, tx } = crearService();

      const creado = await service.crear(alta);

      expect(tx.create).toHaveBeenCalledWith(Servicio, {
        nombre: 'Peeling químico',
        descripcion: 'Renovación de la piel',
        duracionMin: 45,
        precio: 25000,
      });
      expect(tx.create).toHaveBeenCalledWith(ServicioProfesional, {
        servicioId: SERV_ID,
        profesionalId: PROF_A,
      });
      expect(tx.create).toHaveBeenCalledWith(ServicioProfesional, {
        servicioId: SERV_ID,
        profesionalId: PROF_B,
      });
      expect(creado.id).toBe(SERV_ID);
    });

    it('409 si ya existe el nombre, sin distinguir mayúsculas ni espacios (SER-025)', async () => {
      const { service, qb } = crearService({ nombreTomado: true });

      await expect(
        service.crear({ ...alta, nombre: '  PEELING químico ' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(qb.where).toHaveBeenCalledWith(
        'LOWER(TRIM(s.nombre)) = LOWER(TRIM(:nombre))',
        {
          nombre: '  PEELING químico ',
        },
      );
    });

    it('409 (no 500) si el índice único rechaza el alta por una carrera', async () => {
      const { service, tx } = crearService();
      const error = new QueryFailedError('INSERT', [], new Error('duplicate'));
      (error as unknown as { driverError: { code: string } }).driverError = {
        code: '23505',
      };
      tx.save.mockRejectedValueOnce(error);

      await expect(service.crear(alta)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('400 si algún profesional no existe o está inactivo (SER-023)', async () => {
      const { service, profesionalesClient } = crearService();
      profesionalesClient.existenYSonProfesionales.mockResolvedValue({
        verificado: true,
        validos: [PROF_A],
        invalidos: [PROF_B],
      });

      await expect(service.crear(alta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lenient: si Profesionales no responde, crea igual', async () => {
      const { service, profesionalesClient } = crearService();
      profesionalesClient.existenYSonProfesionales.mockResolvedValue({
        verificado: false,
        validos: [],
        invalidos: [],
      });

      await expect(service.crear(alta)).resolves.toMatchObject({ id: SERV_ID });
    });

    it('strict: si Profesionales no responde, 424 (SER-003)', async () => {
      const { service, profesionalesClient } = crearService({ modo: 'strict' });
      profesionalesClient.existenYSonProfesionales.mockResolvedValue({
        verificado: false,
        validos: [],
        invalidos: [],
      });

      await expect(service.crear(alta)).rejects.toMatchObject({ status: 424 });
      await expect(service.crear(alta)).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('actualizar (SER-018)', () => {
    it('modificar sólo el precio (4.a) no toca nombre ni profesionales', async () => {
      const { service, tx, qb, profesionalesClient } = crearService();

      await service.actualizar(SERV_ID, { precio: 18000 });

      expect(tx.save).toHaveBeenCalledWith(
        expect.objectContaining({
          precio: 18000,
          nombre: 'Consulta dermatológica',
        }),
      );
      expect(tx.delete).not.toHaveBeenCalled();
      expect(qb.where).not.toHaveBeenCalled();
      expect(
        profesionalesClient.existenYSonProfesionales,
      ).not.toHaveBeenCalled();
    });

    it('al renombrar excluye al propio servicio del chequeo de unicidad', async () => {
      const { service, qb } = crearService();

      await service.actualizar(SERV_ID, { nombre: 'Consulta' });

      expect(qb.andWhere).toHaveBeenCalledWith('s.id <> :excluirId', {
        excluirId: SERV_ID,
      });
    });

    it('reasigna profesionales reemplazando las asociaciones', async () => {
      const { service, tx } = crearService();

      await service.actualizar(SERV_ID, { profesionalIds: [PROF_B] });

      expect(tx.delete).toHaveBeenCalledWith(ServicioProfesional, {
        servicioId: SERV_ID,
      });
      expect(tx.create).toHaveBeenCalledWith(ServicioProfesional, {
        servicioId: SERV_ID,
        profesionalId: PROF_B,
      });
    });

    it('404 si el servicio no existe', async () => {
      const { service, servicios } = crearService();
      servicios.findOne.mockResolvedValue(null);

      await expect(
        service.actualizar(SERV_ID, { precio: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('darDeBaja: 409 si el servicio tiene turnos vigentes desde hoy (SER-019)', async () => {
    const { service, servicios, turnosClient } = crearService();
    turnosClient.turnosFuturos.mockResolvedValue(2);

    await expect(service.darDeBaja(SERV_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(servicios.save).not.toHaveBeenCalled();
  });

  it('darDeBaja: si Turnos no responde, permite la baja (con WARN)', async () => {
    const { service, servicios, turnosClient } = crearService();
    turnosClient.turnosFuturos.mockResolvedValue(null);

    await service.darDeBaja(SERV_ID);

    expect(servicios.save).toHaveBeenCalledWith(
      expect.objectContaining({ activo: false }),
    );
  });

  it('darDeBaja es lógica: marca activo=false y no borra (SER-009)', async () => {
    const { service, servicios } = crearService();

    await service.darDeBaja(SERV_ID);

    expect(servicios.save).toHaveBeenCalledWith(
      expect.objectContaining({ activo: false }),
    );
  });

  it('listar consulta a Profesionales una sola vez para todo el catálogo (SER-024)', async () => {
    const { service, servicios, profesionalesClient } = crearService();
    servicios.find.mockResolvedValue([
      servicioEntidad(),
      servicioEntidad({
        id: 'otro',
        nombre: 'Toxina',
        servicioProfesionales: [
          { servicioId: 'otro', profesionalId: PROF_A } as ServicioProfesional,
          { servicioId: 'otro', profesionalId: PROF_B } as ServicioProfesional,
        ],
      }),
    ]);

    const lista = await service.listar(true);

    expect(profesionalesClient.resumenPorIds).toHaveBeenCalledTimes(1);
    expect(profesionalesClient.resumenPorIds).toHaveBeenCalledWith([
      PROF_A,
      PROF_B,
    ]);
    expect(lista[1].profesionales).toHaveLength(2);
    expect(lista[0]).not.toHaveProperty('servicioProfesionales');
  });

  it('obtener devuelve el contrato Servicio con fechas ISO y precio numérico', async () => {
    const { service } = crearService();

    await expect(service.obtener(SERV_ID)).resolves.toEqual({
      id: SERV_ID,
      nombre: 'Consulta dermatológica',
      descripcion: 'Evaluación inicial',
      duracionMin: 30,
      precio: 15000,
      activo: true,
      profesionales: [
        {
          id: PROF_A,
          nombreCompleto: 'Prof 1111',
          especialidad: 'X',
          activo: true,
        },
      ],
      creadoEn: '2026-10-01T12:00:00.000Z',
      actualizadoEn: '2026-10-01T12:00:00.000Z',
    });
  });

  it('estado refleja la disponibilidad real de Profesionales (SER-005)', async () => {
    const { service, profesionalesClient } = crearService();
    profesionalesClient.disponible.mockResolvedValue(false);

    await expect(service.estado()).resolves.toEqual({
      modulo: 'servicios',
      dependencias: { profesionales: 'no-disponible' },
      modoValidacion: 'lenient',
    });
  });
});
