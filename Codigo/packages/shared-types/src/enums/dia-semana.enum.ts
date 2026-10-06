/**
 * Día de la semana para los horarios de atención (RN07: sólo lunes a viernes).
 * Deliberadamente no incluye sábado/domingo — hace irrepresentable el estado
 * inválido en vez de depender de una validación aparte.
 */
export enum DiaSemana {
  LUNES = 1,
  MARTES = 2,
  MIERCOLES = 3,
  JUEVES = 4,
  VIERNES = 5,
}
