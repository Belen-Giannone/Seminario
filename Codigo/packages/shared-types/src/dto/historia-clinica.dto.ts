import type { PacienteResumen } from './paciente.dto';

/**
 * Datos mínimos del profesional autor de una entrada clínica — distinto del
 * `ProfesionalResumen` de `profesional.dto.ts` (el contrato PRO-010/SER-021).
 */
export interface AutorEntradaClinica {
  id: string;
  nombre: string;
  apellido: string;
}

export interface EntradaClinica {
  id: string;
  idTurno: string | null;
  fecha: string;
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  fechaActualizacion: string;
  autor: AutorEntradaClinica | null;
}

export interface HistoriaClinica {
  idHistoria: string;
  pacienteId: string;
  nomAppPac: string | null;
  telefono: string | null;
  correo: string | null;
  entradas: EntradaClinica[];
}

export interface HistoriaClinicaInexistente {
  existe: false;
  pacienteId: string;
}

export interface CrearEntradaRequest {
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  turnoId?: string;
}

/** `criterio_busqueda = [dni_pac | (nom_pac + ape_pac)]` (CUU09 paso 1). */
export interface BuscarHistoriaQuery {
  dni?: string;
  nombre?: string;
  apellido?: string;
}

/**
 * Respuesta de `GET /api/historia-clinica`: la HC del único paciente encontrado,
 * la marca de "sin HC previa" (alt 2.a) o la lista para desambiguar.
 */
export type ResultadoBusquedaHistoria =
  HistoriaClinica | HistoriaClinicaInexistente | PacienteResumen[];

export interface EntradaCreadaResponse {
  mensaje: string;
  entrada: EntradaClinica;
}

export const historiaClinicaFixture: HistoriaClinica = {
  idHistoria: '22222222-2222-2222-2222-222222222222',
  pacienteId: '11111111-1111-1111-1111-111111111111',
  nomAppPac: 'Juana Pérez',
  telefono: '3411234567',
  correo: 'juana@syssalud.com',
  entradas: [],
};
