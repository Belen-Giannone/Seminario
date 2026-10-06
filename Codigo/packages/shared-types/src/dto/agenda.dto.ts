/** Un turno visible en la agenda de un profesional (AGE-010). */
export interface AgendaItem {
  idTurno: string;
  /** "YYYY-MM-DD" */
  fecha: string;
  /** "HH:mm" */
  hora: string;
  pacienteNombre: string | null;
  servicioNombre: string | null;
  estado: string;
}

/** Respuesta de `GET /api/agenda/:profesionalId` (CUU05). */
export interface AgendaProfesional {
  idProf: string;
  profesionalNombre: string | null;
  periodo: {
    desde: string;
    hasta: string;
    tipo?: 'dia' | 'semana' | 'mes';
  };
  items: AgendaItem[];
  /** true si la costura con Turnos degradó (AGE-002): la lista puede estar incompleta. */
  ocupacionParcial?: boolean;
  /** Presente cuando `items` está vacío (alt. 1.a de CUU05, AGE-034). */
  mensaje?: string;
}

/** Un horario libre para agendar un turno (AGE-013). */
export interface SlotDisponible {
  /** "YYYY-MM-DD" */
  fecha: string;
  /** "HH:mm" */
  hora: string;
}

/** Query de `GET /api/agenda/:profesionalId`. */
export interface ConsultarAgendaQuery {
  profesionalId: string;
  desde: string;
  hasta: string;
  periodo?: 'dia' | 'semana' | 'mes';
}

/** Query de `GET /api/agenda/:profesionalId/disponibilidad`. */
export interface DisponibilidadQuery {
  profesionalId: string;
  servicioId: string;
  desde: string;
  hasta: string;
}
