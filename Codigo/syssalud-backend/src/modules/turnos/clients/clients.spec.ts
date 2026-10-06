import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { PacientesClient } from './pacientes.client';
import { ServiciosClient } from './servicios.client';
import { ProfesionalesClient } from './profesionales.client';
import { AgendaClient } from './agenda.client';
import { PagosClient } from './pagos.client';
import { NotificacionesClient } from './notificaciones.client';
import { EstadoPago } from '@syssalud/shared-types';

function httpMock() {
  return { get: jest.fn(), post: jest.fn() };
}
function configMock() {
  return { get: jest.fn((_key: string, fallback: unknown) => fallback) };
}
function axios404() {
  const err = new Error('Not Found') as AxiosError;
  err.response = { status: 404 } as never;
  return err;
}
function axiosTimeout() {
  const err = new Error('timeout') as AxiosError;
  return err;
}

describe('Clientes de costuras de Turnos (TUR-045)', () => {
  describe('PacientesClient', () => {
    it('OK: devuelve el resultado real', async () => {
      const http = httpMock();
      http.get.mockReturnValue(of({ data: { registrado: true } }));
      const client = new PacientesClient(http as any, configMock() as any);
      await expect(client.estaRegistrado('p-1')).resolves.toBe(true);
    });

    it('404: no registrado', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axios404()));
      const client = new PacientesClient(http as any, configMock() as any);
      await expect(client.estaRegistrado('p-1')).resolves.toBe(false);
    });

    it('timeout: degrada a null (desconocido)', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new PacientesClient(http as any, configMock() as any);
      await expect(client.estaRegistrado('p-1')).resolves.toBeNull();
    });
  });

  describe('ServiciosClient', () => {
    it('OK: devuelve precio/duración', async () => {
      const http = httpMock();
      http.get.mockReturnValue(of({ data: { nombre: 'Consulta', duracionMin: 30, precio: 5000, activo: true } }));
      const client = new ServiciosClient(http as any, configMock() as any);
      await expect(client.obtener('s-1')).resolves.toEqual(
        expect.objectContaining({ precio: 5000 }),
      );
    });

    it('caída: degrada a null (monto 0 lo decide el service)', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new ServiciosClient(http as any, configMock() as any);
      await expect(client.obtener('s-1')).resolves.toBeNull();
    });
  });

  describe('ProfesionalesClient', () => {
    it('OK: existe', async () => {
      const http = httpMock();
      http.get.mockReturnValue(of({ data: { id: 'prof-1' } }));
      const client = new ProfesionalesClient(http as any, configMock() as any);
      await expect(client.existe('prof-1')).resolves.toBe('si');
    });

    it('404: no existe', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axios404()));
      const client = new ProfesionalesClient(http as any, configMock() as any);
      await expect(client.existe('prof-1')).resolves.toBe('no');
    });

    it('timeout: desconocido (best-effort, TUR-024)', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new ProfesionalesClient(http as any, configMock() as any);
      await expect(client.existe('prof-1')).resolves.toBe('desconocido');
    });
  });

  describe('AgendaClient', () => {
    it('OK: devuelve los slots', async () => {
      const http = httpMock();
      http.get.mockReturnValue(of({ data: [{ hora: '10:00' }] }));
      const client = new AgendaClient(http as any, configMock() as any);
      await expect(client.disponibilidad('prof-1', 's-1', '2026-11-10')).resolves.toEqual([
        { hora: '10:00' },
      ]);
    });

    it('caída: null → disponibilidadNoValidada (decide el service según el modo)', async () => {
      const http = httpMock();
      http.get.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new AgendaClient(http as any, configMock() as any);
      await expect(client.disponibilidad('prof-1', 's-1', '2026-11-10')).resolves.toBeNull();
    });
  });

  describe('PagosClient', () => {
    it('OK: procesa el pago', async () => {
      const http = httpMock();
      http.post.mockReturnValue(of({ data: { estado: EstadoPago.APROBADO, pagoId: 'pago-1' } }));
      const client = new PagosClient(http as any, configMock() as any);
      await expect(client.procesar('t-1', 'TARJETA' as never, 5000, 'tx-1')).resolves.toEqual(
        expect.objectContaining({ estado: EstadoPago.APROBADO }),
      );
    });

    it('caída: null → el turno queda pagoPendiente', async () => {
      const http = httpMock();
      http.post.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new PagosClient(http as any, configMock() as any);
      await expect(client.procesar('t-1', 'TARJETA' as never, 5000, 'tx-1')).resolves.toBeNull();
    });

    it('ajustarReembolso nunca lanza aunque la costura esté caída', async () => {
      const http = httpMock();
      http.post.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new PagosClient(http as any, configMock() as any);
      await expect(client.ajustarReembolso('pago-1')).resolves.toBeUndefined();
    });
  });

  describe('NotificacionesClient', () => {
    it('caída: no lanza, queda solo en log', async () => {
      const http = httpMock();
      http.post.mockReturnValue(throwError(() => axiosTimeout()));
      const client = new NotificacionesClient(http as any, configMock() as any);
      await expect(client.enviar('x@x.com', 'hola')).resolves.toBeUndefined();
    });
  });
});
