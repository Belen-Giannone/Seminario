import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja E): CUU08 - Visualizar métricas de desempeño (Profesional sobre sí
 * mismo, RN15). Filtrar siempre por el `sub` del JWT del profesional autenticado.
 */
@Injectable()
export class MetricasDesempenoService {
  estado() {
    return { modulo: 'metricas-desempeno', estado: 'pendiente', cubre: ['CUU08'] };
  }
}
