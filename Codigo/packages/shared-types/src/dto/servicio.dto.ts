import type { ProfesionalResumen } from './profesional.dto';

/**
 * Contratos del módulo Servicios — CUU10 (SER-010).
 * Diccionario: `serv = id_serv + nom_serv + desc_serv + duracion_serv + precio_serv + 1{id_prof}n`.
 */

/**
 * Profesional asociado a un servicio (SER-024). Si Profesionales no responde
 * sólo se conoce el `id`; el resto de los datos llega best-effort.
 */
export type ProfesionalDelServicio = Pick<ProfesionalResumen, 'id'> &
  Partial<Omit<ProfesionalResumen, 'id'>>;

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  /** ARS, 2 decimales. */
  precio: number;
  activo: boolean;
  profesionales: ProfesionalDelServicio[];
  creadoEn: string;
  actualizadoEn: string;
}

/** `servicios_disponibles = 1{id_serv + nom_serv + precio_serv}n`, para selectores. */
export interface ServicioResumen {
  id: string;
  nombre: string;
  precio: number;
  duracionMin: number;
}

export interface CrearServicioRequest {
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  profesionalIds: string[];
}

/** Soporta `1.a` (modificar), `4.a` (sólo precio) y la reactivación (`activo: true`). */
export type ActualizarServicioRequest = Partial<CrearServicioRequest> & {
  activo?: boolean;
};

/** Respuesta de `GET /api/servicios/_estado` (SER-005). */
export interface EstadoServiciosResponse {
  modulo: 'servicios';
  dependencias: { profesionales: 'ok' | 'no-disponible' };
  modoValidacion: 'lenient' | 'strict';
}

export const servicioFixture: Servicio = {
  id: '44444444-4444-4444-4444-444444444444',
  nombre: 'Consulta dermatológica',
  descripcion: 'Evaluación inicial de la piel y plan de tratamiento.',
  duracionMin: 30,
  precio: 15000,
  activo: true,
  profesionales: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      nombreCompleto: 'Carlos Bilardo',
      especialidad: 'Dermatología',
      activo: true,
    },
  ],
  creadoEn: '2026-10-01T12:00:00.000Z',
  actualizadoEn: '2026-10-01T12:00:00.000Z',
};
