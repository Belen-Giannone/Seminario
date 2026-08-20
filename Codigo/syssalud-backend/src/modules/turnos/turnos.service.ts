import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja C): CUU02 Solicitar turno, CUU03 Cancelar turno, CUU04 Reprogramar turno.
 * - Entidad `Turno` + EstadoTurno (@syssalud/shared-types) siguiendo ART ME.
 * - Al confirmar, invocar PagosService.procesar(...) y NotificacionesService.enviar(...)
 *   por inyección de dependencias — nunca HTTP interno.
 * - RN12/RN13: paciente solo puede cancelar/reprogramar con 24hs de anticipación,
 *   el asistente sin restricción.
 */
@Injectable()
export class TurnosService {
  estado() {
    return { modulo: 'turnos', estado: 'pendiente', cubre: ['CUU02', 'CUU03', 'CUU04'] };
  }
}
