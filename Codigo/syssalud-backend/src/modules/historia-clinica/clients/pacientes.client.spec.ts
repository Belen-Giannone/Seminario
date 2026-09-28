/// <reference types="jest" />

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { PacientesClient } from './pacientes.client';

describe('PacientesClient', () => {
  const config = { get: jest.fn().mockReturnValue('http://pacientes.test/api') };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('busca pacientes por criterio', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 'paciente-1', nombreCompleto: 'Dolores Campos' }],
    } as Response);
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222')).resolves.toEqual([
      { id: 'paciente-1', nombreCompleto: 'Dolores Campos' },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://pacientes.test/api/pacientes?buscar=30111222');
  });

  it('devuelve null cuando el paciente no existe', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
    const client = new PacientesClient(config as never);

    await expect(client.obtener('paciente-inexistente')).resolves.toBeNull();
  });

  it('propaga errores de red para que el service aplique lenient/strict', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222')).rejects.toThrow('timeout');
  });
});
