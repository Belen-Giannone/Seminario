import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja B): entidad `Profesional` (especialidad, horarios de atención).
 * - Exponer método público (ej. `horariosDe(profesionalId, fecha)`) para que
 *   el módulo Agenda calcule disponibilidad sin tocar esta entidad directamente.
 */
@Injectable()
export class ProfesionalesService {
  estado() {
    return { modulo: 'profesionales', estado: 'pendiente', cubre: ['soporte de Agenda'] };
  }
}
