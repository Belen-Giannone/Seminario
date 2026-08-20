import { Injectable, Logger } from '@nestjs/common';

/**
 * TODO (Pareja D): servicio invocado por Pacientes/Turnos/Pagos al confirmar,
 * cancelar o reprogramar. Para el TP alcanza con loggear — no hace falta
 * mandar emails/SMS reales salvo que quieran ir más allá del alcance.
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  enviar(destinatarioEmail: string, mensaje: string) {
    this.logger.log(`→ ${destinatarioEmail}: ${mensaje}`);
  }

  estado() {
    return { modulo: 'notificaciones', estado: 'pendiente', cubre: ['transversal'] };
  }
}
