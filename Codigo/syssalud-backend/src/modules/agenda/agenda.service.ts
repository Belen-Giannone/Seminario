import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja C): CUU05 - Consultar agenda.
 * - Inyectar ProfesionalesService + TurnosService (nunca sus repositories).
 * - Devolver disponibilidad = horarios del profesional menos turnos ya ocupados.
 */
@Injectable()
export class AgendaService {
  estado() {
    return { modulo: 'agenda', estado: 'pendiente', cubre: ['CUU05'] };
  }
}
