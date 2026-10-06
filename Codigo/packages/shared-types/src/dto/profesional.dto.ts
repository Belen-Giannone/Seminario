import { DiaSemana } from '../enums/dia-semana.enum';

export interface HorarioAtencion {
  id: string;
  profesionalId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

/** Franja a crear/reemplazar: sin `id`/`profesionalId`, los asigna el servidor. */
export interface HorarioAtencionInput {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

/** Contrato exacto que consume Servicios (`SER-021`) — no agregar campos sin avisarles. */
export interface ProfesionalResumen {
  id: string;
  nombreCompleto: string;
  especialidad: string;
  activo: boolean;
}

export interface Profesional extends ProfesionalResumen {
  usuarioId: string | null;
  matricula: string;
  email: string;
  horarios: HorarioAtencion[];
}

export interface CrearProfesionalRequest {
  nombre: string;
  apellido: string;
  email: string;
  dni?: string;
  especialidad: string;
  matricula: string;
  horarios?: HorarioAtencionInput[];
}

export type ActualizarProfesionalRequest = Partial<{
  especialidad: string;
  matricula: string;
  activo: boolean;
}>;

/** Reemplaza el set completo de horarios del profesional. */
export interface DefinirHorariosRequest {
  horarios: HorarioAtencionInput[];
}

export const profesionalResumenFixture: ProfesionalResumen = {
  id: '33333333-3333-3333-3333-333333333333',
  nombreCompleto: 'Carlos Bilardo',
  especialidad: 'Dermatología',
  activo: true,
};
