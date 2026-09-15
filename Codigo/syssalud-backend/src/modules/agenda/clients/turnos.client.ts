import { Injectable, Logger } from '@nestjs/common';
import { AgendaItem } from '@syssalud/shared-types';
import { fetchJson } from './http.util';

export interface OcupacionResultado {
  items: AgendaItem[];
  /** true si la costura degradó: se asume 0 ocupación (AGE-002 / AGE-017). */
  parcial: boolean;
}

/** Costura saliente hacia Turnos (AGE-017): turnos ocupados en un rango. */
@Injectable()
export class TurnosClient {
  private readonly logger = new Logger(TurnosClient.name);
  private readonly baseUrl =
    process.env.TURNOS_API_URL || 'http://localhost:4000/api';

  /** `GET /api/turnos?profesionalId=&desde=&hasta=`. Degrada a `parcial: true` + lista vacía. */
  async ocupacion(
    profesionalId: string,
    desde: string,
    hasta: string,
  ): Promise<OcupacionResultado> {
    const query = new URLSearchParams({ profesionalId, desde, hasta });
    const res = await fetchJson<AgendaItem[]>(
      `${this.baseUrl}/turnos?${query.toString()}`,
    );
    if (res.kind === 'ok') {
      return { items: res.data, parcial: false };
    }
    this.logger.warn(
      `No se pudo obtener la ocupación de turnos del profesional ${profesionalId} (AGE-002): se asume sin ocupación.`,
    );
    return { items: [], parcial: true };
  }
}
