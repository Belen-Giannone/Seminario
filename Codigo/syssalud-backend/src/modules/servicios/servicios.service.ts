import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja B): CUU10 - Mantener catálogo de servicios.
 * - Entidad `Servicio` (nombre, descripción, duración, precio, profesionales asociados).
 * - Exponer método público de solo lectura para que Turnos/Agenda calculen duración y precio.
 */
@Injectable()
export class ServiciosService {
  estado() {
    return { modulo: 'servicios', estado: 'pendiente', cubre: ['CUU10'] };
  }
}
