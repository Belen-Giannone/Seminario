import { Injectable, Logger } from '@nestjs/common';
import { EstadoTurno, type TurnoResumen } from '@syssalud/shared-types';
import { fetchJson } from './http.util';

/** Estados que liberan el horario (RN18): no ocupan la agenda ni se listan en CUU05. */
const ESTADOS_LIBERADOS: string[] = [
  EstadoTurno.CANCELADO,
  EstadoTurno.NO_CONFIRMADO,
];

export interface OcupacionResultado {
  turnos: TurnoResumen[];
  /** true si la costura degradó: se asume 0 ocupación (AGE-002 / AGE-017). */
  parcial: boolean;
}

/** Costura saliente hacia Turnos (AGE-017): turnos que ocupan horario en un rango. */
@Injectable()
export class TurnosClient {
  private readonly logger = new Logger(TurnosClient.name);
  private readonly baseUrl =
    process.env.TURNOS_API_URL || 'http://localhost:4000/api';

  /**
   * `GET /api/turnos?profesionalId=&desde=&hasta=`, sin cancelados ni no
   * confirmados (AGE-007). Degrada a `parcial: true` + lista vacía.
   */
  async ocupacion(
    profesionalId: string,
    desde: string,
    hasta: string,
  ): Promise<OcupacionResultado> {
    const query = new URLSearchParams({ profesionalId, desde, hasta });
    const res = await fetchJson<TurnoResumen[]>(
      `${this.baseUrl}/turnos?${query.toString()}`,
    );
    if (res.kind === 'ok' && Array.isArray(res.data)) {
      return {
        turnos: res.data.filter((t) => !ESTADOS_LIBERADOS.includes(t.estado)),
        parcial: false,
      };
    }
    this.logger.warn(
      `No se pudo obtener la ocupación de turnos del profesional ${profesionalId} (AGE-002): se asume sin ocupación.`,
    );
    return { turnos: [], parcial: true };
  }
}
