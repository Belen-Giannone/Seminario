import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja D): CUU06 - Generar comprobante de turno + procesar pago (RN11, RN16, RN20-23).
 * - Entidad `Pago` + EstadoPago / MetodoPago (@syssalud/shared-types).
 * - Exponer `procesar(turnoId, metodo, monto)` para que Turnos lo invoque al confirmar.
 */
@Injectable()
export class PagosService {
  estado() {
    return { modulo: 'pagos', estado: 'pendiente', cubre: ['CUU06'] };
  }
}
