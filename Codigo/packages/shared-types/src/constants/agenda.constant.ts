/**
 * Tamaño del bloque de agenda en minutos (SER-026). Constante compartida entre
 * Servicios (validar que `duracionMin` sea múltiplo de este valor), Profesionales
 * (granularidad de `HorarioAtencion`) y Agenda/Turnos (cálculo de slots).
 */
export const BLOQUE_AGENDA_MIN = 15;
