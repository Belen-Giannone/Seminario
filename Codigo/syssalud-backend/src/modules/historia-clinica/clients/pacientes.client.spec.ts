import { PacientesClient } from './pacientes.client';

const AUTH = 'Bearer token-profesional';

function respuesta(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('PacientesClient', () => {
  const config = {
    get: jest.fn().mockReturnValue('http://pacientes.test/api'),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('busca pacientes por criterio reenviando el JWT', async () => {
    const lista = [
      {
        id: 'p1',
        numeroPaciente: 1,
        nombreCompleto: 'Juana Pérez',
        dni: '30111222',
      },
    ];
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(respuesta(200, lista));
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222', AUTH)).resolves.toEqual(lista);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://pacientes.test/api/pacientes?buscar=30111222',
      expect.objectContaining({ headers: { Authorization: AUTH } }),
    );
  });

  it('falla si Pacientes no devuelve una lista', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(respuesta(200, { modulo: 'pacientes' }));
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222', AUTH)).rejects.toThrow(
      'Respuesta inválida de Pacientes',
    );
  });

  it('propaga un 401 como error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(respuesta(401));
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222', AUTH)).rejects.toThrow('HTTP 401');
  });

  it('devuelve null cuando el paciente no existe', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(respuesta(404));
    const client = new PacientesClient(config as never);

    await expect(client.obtener('p-inexistente', AUTH)).resolves.toBeNull();
  });

  it('propaga errores de red para que el service aplique lenient/strict', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const client = new PacientesClient(config as never);

    await expect(client.buscar('30111222', AUTH)).rejects.toThrow('timeout');
  });

  it('disponible() es false si Pacientes no responde', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const client = new PacientesClient(config as never);

    await expect(client.disponible()).resolves.toBe(false);
  });
});
