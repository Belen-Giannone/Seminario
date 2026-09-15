import { Injectable, Logger } from '@nestjs/common';
import { HorarioAtencion } from '@syssalud/shared-types';
import { fetchJson } from './http.util';

export type ExistenciaProfesional = 'si' | 'no' | 'desconocido';

/**
 * Costura saliente hacia Profesionales (AGE-016). Nunca importa su service:
 * habla sólo por REST, con base URL configurable y degradación (AGE-002).
 */
@Injectable()
export class ProfesionalesClient {
  private readonly logger = new Logger(ProfesionalesClient.name);
  private readonly baseUrl =
    process.env.PROFESIONALES_API_URL || 'http://localhost:4000/api';

  /** `GET /api/profesionales/:id/horarios`. `null` si la costura no responde (AGE-002). */
  async horariosDe(profesionalId: string): Promise<HorarioAtencion[] | null> {
    const res = await fetchJson<HorarioAtencion[]>(
      `${this.baseUrl}/profesionales/${profesionalId}/horarios`,
    );
    if (res.kind === 'ok') {
      return res.data;
    }
    this.logger.warn(
      `No se pudieron obtener horarios del profesional ${profesionalId} (AGE-002): disponibilidad vacía.`,
    );
    return null;
  }

  /** `GET /api/profesionales/:id`. Distingue "no existe" de "costura caída". */
  async existe(profesionalId: string): Promise<ExistenciaProfesional> {
    const res = await fetchJson<{ id: string }>(
      `${this.baseUrl}/profesionales/${profesionalId}`,
    );
    if (res.kind === 'ok') {
      return 'si';
    }
    if (res.kind === 'not-found') {
      return 'no';
    }
    this.logger.warn(
      `No se pudo validar la existencia del profesional ${profesionalId} (AGE-002).`,
    );
    return 'desconocido';
  }
}
