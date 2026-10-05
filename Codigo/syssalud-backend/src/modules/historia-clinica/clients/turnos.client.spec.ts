import { TurnosClient } from './turnos.client';

const AUTH = 'Bearer token-profesional';

function respuesta(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('TurnosClient', () => {
  const config = { get: jest.fn().mockReturnValue('http://turnos.test/api') };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consulta turnos asistidos con paciente, profesional, estado y JWT', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        respuesta(200, [{ idTurno: 'turno-1', fecha: '2026-09-14' }]),
      );
    const client = new TurnosClient(config as never);

    await expect(
      client.turnosAsistidos('paciente-1', 'profesional-1', AUTH),
    ).resolves.toEqual([{ idTurno: 'turno-1', fecha: '2026-09-14' }]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('pacienteId=paciente-1');
    expect(url).toContain('profesionalId=profesional-1');
    expect(url).toContain('estado=ASISTIDO');
    expect(init.headers).toEqual({ Authorization: AUTH });
  });

  it('falla si Turnos no devuelve una lista', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(respuesta(200, { modulo: 'turnos' }));
    const client = new TurnosClient(config as never);

    await expect(
      client.turnosAsistidos('paciente-1', 'profesional-1', AUTH),
    ).rejects.toThrow('Respuesta inválida de Turnos');
  });

  it('propaga timeout para que el service aplique el modo', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const client = new TurnosClient(config as never);

    await expect(
      client.turnosAsistidos('paciente-1', 'profesional-1', AUTH),
    ).rejects.toThrow('timeout');
  });
});
