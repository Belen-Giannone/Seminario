import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja E): CUU07 - Visualizar métricas del negocio (solo Dueño, RN14).
 * - Sin entidad propia: agrega datos de Turnos + Pagos + Servicios + Profesionales
 *   por inyección de sus servicios.
 * - Proteger con @Roles(Rol.DUENO) + RolesGuard.
 */
@Injectable()
export class MetricasNegocioService {
  estado() {
    return { modulo: 'metricas-negocio', estado: 'pendiente', cubre: ['CUU07'] };
  }
}
