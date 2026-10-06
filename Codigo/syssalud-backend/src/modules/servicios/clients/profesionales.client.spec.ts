import { profesionalResumenFixture } from '@syssalud/shared-types';
import { of, throwError } from 'rxjs';
import { RequestContextMiddleware } from '../../../shared/request-context';
import { ProfesionalesClient } from './profesionales.client';

/** SER-040: costura con HTTP mockeado — OK / caída → fallback sin excepción. */
function crearClient(respuesta: unknown, modo?: string) {
  const http = {
    get: jest.fn(() =>
      respuesta instanceof Error
        ? throwError(() => respuesta)
        : of({ data: respuesta }),
    ),
  };
  const config = {
    get: jest.fn((clave: string, porDefecto?: string) =>
      clave === 'SERVICIOS_VALIDAR_PROFESIONALES' ? modo : porDefecto,
    ),
  };
  return {
    client: new ProfesionalesClient(http as never, config as never),
    http,
  };
}

function conAutorizacion<T>(
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

describe('ProfesionalesClient (Servicios)', () => {
  const otroId = '99999999-9999-4999-8999-999999999999';

  it('consulta ?ids= reenviando el JWT y mapea al contrato de Profesionales', async () => {
    const { client, http } = crearClient([profesionalResumenFixture]);

    const resumen = await conAutorizacion('Bearer t', () =>
      client.resumenPorIds([profesionalResumenFixture.id, otroId]),
    );

    expect(resumen).toEqual([profesionalResumenFixture, { id: otroId }]);
    expect(http.get).toHaveBeenCalledWith(
      'http://localhost:4000/api/profesionales',
      {
        params: { ids: `${profesionalResumenFixture.id},${otroId}` },
        headers: { Authorization: 'Bearer t' },
        timeout: 2000,
      },
    );
  });

  it('si la costura cae, resumenPorIds devuelve sólo los ids sin lanzar', async () => {
    const { client } = crearClient(new Error('ECONNREFUSED'));

    await expect(client.resumenPorIds(['a'])).resolves.toEqual([{ id: 'a' }]);
  });

  it('existenYSonProfesionales marca inválidos los inexistentes e inactivos', async () => {
    const inactivo = {
      ...profesionalResumenFixture,
      id: 'inactivo',
      activo: false,
    };
    const { client } = crearClient([profesionalResumenFixture, inactivo]);

    await expect(
      client.existenYSonProfesionales([
        profesionalResumenFixture.id,
        'inactivo',
        otroId,
      ]),
    ).resolves.toEqual({
      verificado: true,
      validos: [profesionalResumenFixture.id],
      invalidos: ['inactivo', otroId],
    });
  });

  it('existenYSonProfesionales informa verificado:false si la costura no responde', async () => {
    const { client } = crearClient(new Error('timeout'));

    await expect(client.existenYSonProfesionales(['a'])).resolves.toEqual({
      verificado: false,
      validos: [],
      invalidos: [],
    });
  });

  it('modoValidacion sale de SERVICIOS_VALIDAR_PROFESIONALES (default lenient)', () => {
    expect(crearClient([]).client.modoValidacion).toBe('lenient');
    expect(crearClient([], 'strict').client.modoValidacion).toBe('strict');
  });
});
