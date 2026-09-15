import { Injectable, Logger } from '@nestjs/common';
import { fetchJson } from './http.util';

/** Costura saliente hacia Servicios (AGE-018): duración del servicio para armar bloques. */
@Injectable()
export class ServiciosClient {
  private readonly logger = new Logger(ServiciosClient.name);
  private readonly baseUrl =
    process.env.SERVICIOS_API_URL || 'http://localhost:4000/api';

  /** `GET /api/servicios/:id`. `null` si la costura degrada (se usa el bloque por defecto). */
  async obtener(servicioId: string): Promise<{ duracionMin: number } | null> {
    const res = await fetchJson<{ duracionMin: number }>(
      `${this.baseUrl}/servicios/${servicioId}`,
    );
    if (res.kind === 'ok') {
      return { duracionMin: res.data.duracionMin };
    }
    this.logger.warn(
      `No se pudo obtener la duración del servicio ${servicioId} (AGE-002): se usa el bloque de agenda por defecto.`,
    );
    return null;
  }
}
