import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja A): CUU01 - Registrar paciente.
 * - Entidad `Paciente` (TypeORM) referenciando `Usuario` (auth) por usuarioId.
 * - Exponer un método público (ej. `buscarPorId`, `buscarPorDni`) para que
 *   Turnos y Agenda lo consuman por inyección, nunca importando el repository.
 */
@Injectable()
export class PacientesService {
  estado() {
    return { modulo: 'pacientes', estado: 'pendiente', cubre: ['CUU01'] };
  }
}
