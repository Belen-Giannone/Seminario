/// <reference types="jest" />

import { TurnosClient } from './turnos.client';

describe('TurnosClient', () => {
  const config = { get: jest.fn().mockReturnValue('http://turnos.test/api') };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consulta turnos asistidos con paciente, profesional y estado', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ idTurno: 'turno-1', fecha: '2026-09-14' }],
    } as Response);
    const client = new TurnosClient(config as never);

    await expect(client.turnosAsistidos('paciente-1', 'profesional-1')).resolves.toEqual([
      { idTurno: 'turno-1', fecha: '2026-09-14' },
    ]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('pacienteId=paciente-1');
    expect(url).toContain('profesionalId=profesional-1');
    expect(url).toContain('estado=ASISTIDO');
  });

  it('propaga timeout o error HTTP para que el service aplique el modo', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const client = new TurnosClient(config as never);

    await expect(client.turnosAsistidos('paciente-1', 'profesional-1')).rejects.toThrow('timeout');
  });
});
