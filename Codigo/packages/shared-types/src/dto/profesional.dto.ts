import { DiaSemana } from '../enums/dia-semana.enum';

export interface HorarioAtencion {
  id: string;
  profesionalId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface Profesional {
  id: string;
  usuarioId: string;
  especialidad: string;
  matricula: string | null;
  creadoEn: string;
  actualizadoEn: string;
  horarios?: HorarioAtencion[];
}

export interface CrearProfesionalRequest {
  usuarioId: string;
  especialidad: string;
  matricula?: string;
}

export interface CrearHorarioRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}
