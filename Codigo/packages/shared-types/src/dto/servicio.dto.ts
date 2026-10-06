/* Contratos compartidos para el módulo Servicios
 * SER-010, SER-012: Tipos exportados explícitamente para backend y frontend */

export interface ProfesionalResumen {
  id: string;
  nombreCompleto: string | null;
  activo: boolean | null;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  duracionMin: number;
  precio: number;
  activo: boolean;
  profesionales: ProfesionalResumen[];
  creadoEn: string;
  actualizadoEn: string;
}

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

export interface ActualizarServicioRequest {
  nombre?: string;
  descripcion?: string;
  duracionMin?: number;
  precio?: number;
  profesionalIds?: string[];
  activo?: boolean;
}

export interface EstadoServiciosResponse {
  modulo: string;
  dependencias: Record<string, 'ok' | 'no-disponible'>;
  modoValidacion: 'lenient' | 'strict';
}