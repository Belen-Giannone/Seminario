/**
 * Franja horaria de atención de un profesional para un día de la semana (PRO-007).
 * Es el contrato de entrada que Agenda consume de Profesionales vía
 * `GET /api/profesionales/:id/horarios` (AGE-016).
 */
export interface HorarioAtencion {
  /** 1 = lunes ... 5 = viernes (ISO). RN07: sólo se atiende de lunes a viernes. */
  diaSemana: number;
  /** "HH:mm" */
  horaInicio: string;
  /** "HH:mm" */
  horaFin: string;
}
