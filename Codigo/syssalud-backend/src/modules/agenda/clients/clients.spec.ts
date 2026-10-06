import { ProfesionalesClient } from './profesionales.client';
import { TurnosClient } from './turnos.client';
import { ServiciosClient } from './servicios.client';
import { FeriadosClient } from './feriados.client';
import { RequestContextMiddleware } from '../../../shared/request-context';

/** Ejecuta `fn` dentro del contexto de un request con ese header Authorization. */
function runConAutorizacion<T>(
  authorization: string,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    new RequestContextMiddleware().use(
      { headers: { authorization } } as never,
      {} as never,
      () => {
        fn().then(resolve, reject);
      },
    );
  });
}

/** AGE-030: costuras con HTTP mockeado — OK / 404 / timeout(error) -> fallback y flags de degradación. */
describe('Costuras salientes de Agenda', () => {
  let fetchMock: jest.SpyInstance;

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.FERIADOS_API_URL;
  });

  const mockOk = (data: unknown) =>
    (fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    } as Response));

  const mockNotFound = () =>
    (fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    } as Response));

  const mockError = () =>
    (fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network error')));

  describe('ProfesionalesClient', () => {
    it('horariosDe devuelve los horarios cuando la costura responde OK', async () => {
      mockOk([{ diaSemana: 1, horaInicio: '09:00', horaFin: '17:00' }]);
      const client = new ProfesionalesClient();
      await expect(client.horariosDe('p1')).resolves.toEqual([
        { diaSemana: 1, horaInicio: '09:00', horaFin: '17:00' },
      ]);
    });

    it('horariosDe degrada a null si la costura no responde (AGE-002)', async () => {
      mockError();
      const client = new ProfesionalesClient();
      await expect(client.horariosDe('p1')).resolves.toBeNull();
    });

    it('existe distingue "no" (404) de "desconocido" (costura caída)', async () => {
      mockOk({ id: 'p1', nombreCompleto: 'Carlos Bilardo' });
      let client = new ProfesionalesClient();
      await expect(client.existe('p1')).resolves.toEqual({
        estado: 'si',
        nombre: 'Carlos Bilardo',
      });
      fetchMock.mockRestore();

      mockNotFound();
      client = new ProfesionalesClient();
      await expect(client.existe('p1')).resolves.toEqual({ estado: 'no' });
      fetchMock.mockRestore();

      mockError();
      client = new ProfesionalesClient();
      await expect(client.existe('p1')).resolves.toEqual({
        estado: 'desconocido',
      });
    });
  });

  describe('TurnosClient', () => {
    it('ocupacion devuelve los turnos que ocupan horario, sin cancelados (RN18)', async () => {
      mockOk([
        {
          idTurno: 't1',
          fecha: '2026-09-14',
          hora: '09:00',
          estado: 'CONFIRMADO',
        },
        {
          idTurno: 't2',
          fecha: '2026-09-14',
          hora: '10:00',
          estado: 'CANCELADO',
        },
        {
          idTurno: 't3',
          fecha: '2026-09-14',
          hora: '11:00',
          estado: 'NO_CONFIRMADO',
        },
      ]);
      const client = new TurnosClient();
      const res = await client.ocupacion('p1', '2026-09-14', '2026-09-18');
      expect(res.parcial).toBe(false);
      expect(res.turnos.map((t) => t.idTurno)).toEqual(['t1']);
    });

    it('reenvía el JWT del request en curso a la costura', async () => {
      mockOk([]);
      await runConAutorizacion('Bearer token-x', () =>
        new TurnosClient().ocupacion('p1', '2026-09-14', '2026-09-18'),
      );
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init).toMatchObject({
        headers: { Authorization: 'Bearer token-x' },
      });
    });

    it('degrada a lista vacía + parcial:true si la costura falla (AGE-002/AGE-017)', async () => {
      mockError();
      const client = new TurnosClient();
      const res = await client.ocupacion('p1', '2026-09-14', '2026-09-18');
      expect(res).toEqual({ turnos: [], parcial: true });
    });
  });

  describe('ServiciosClient', () => {
    it('obtener devuelve la duración cuando la costura responde', async () => {
      mockOk({ duracionMin: 30, nombre: 'Consulta' });
      const client = new ServiciosClient();
      await expect(client.obtener('s1')).resolves.toEqual({
        duracionMin: 30,
        nombre: 'Consulta',
      });
    });

    it('degrada a null si la costura falla (se usa el bloque por defecto)', async () => {
      mockError();
      const client = new ServiciosClient();
      await expect(client.obtener('s1')).resolves.toBeNull();
    });
  });

  describe('FeriadosClient', () => {
    it('sin FERIADOS_API_URL usa directamente el dataset local', async () => {
      const client = new FeriadosClient();
      const feriados = await client.deAnio(2026);
      expect(feriados.has('2026-01-01')).toBe(true);
    });

    it('con FERIADOS_API_URL configurada usa la respuesta remota', async () => {
      process.env.FERIADOS_API_URL = 'http://feriados.example';
      mockOk(['2026-05-01']);
      const client = new FeriadosClient();
      const feriados = await client.deAnio(2026);
      expect(feriados).toEqual(new Set(['2026-05-01']));
    });

    it('si la API de feriados fallara, cae al dataset local (AGE-019)', async () => {
      process.env.FERIADOS_API_URL = 'http://feriados.example';
      mockError();
      const client = new FeriadosClient();
      const feriados = await client.deAnio(2026);
      expect(feriados.has('2026-01-01')).toBe(true);
    });
  });
});
