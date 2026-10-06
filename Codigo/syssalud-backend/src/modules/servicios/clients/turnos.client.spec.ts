import { of, throwError } from 'rxjs';
import { TurnosClient } from './turnos.client';

function crearClient(respuesta: unknown) {
  const http = {
    get: jest.fn(() =>
      respuesta instanceof Error
        ? throwError(() => respuesta)
        : of({ data: respuesta }),
    ),
  };
  const config = {
    get: jest.fn((_clave: string, porDefecto?: string) => porDefecto),
  };
  return { client: new TurnosClient(http as never, config as never), http };
}

describe('TurnosClient (Servicios, SER-019)', () => {
  it('cuenta sólo los turnos vigentes del servicio desde hoy', async () => {
    const { client, http } = crearClient([
      {
        idTurno: '1',
        fecha: '2026-10-10',
        hora: '09:00',
        estado: 'CONFIRMADO',
      },
      {
        idTurno: '2',
        fecha: '2026-10-11',
        hora: '09:00',
        estado: 'SOLICITADO',
      },
      { idTurno: '3', fecha: '2026-10-12', hora: '09:00', estado: 'CANCELADO' },
      {
        idTurno: '4',
        fecha: '2026-10-13',
        hora: '09:00',
        estado: 'NO_CONFIRMADO',
      },
    ]);

    await expect(client.turnosFuturos('s1')).resolves.toBe(2);
    expect(http.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/turnos',
      expect.objectContaining({
        params: {
          servicioId: 's1',
          desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown,
        },
      }),
    );
  });

  it('devuelve null si Turnos no responde', async () => {
    const { client } = crearClient(new Error('ECONNREFUSED'));

    await expect(client.turnosFuturos('s1')).resolves.toBeNull();
  });
});
