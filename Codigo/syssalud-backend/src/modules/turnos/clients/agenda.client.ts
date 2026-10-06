import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOrDegrade } from './http-result.util';

export interface SlotDisponible {
  hora: string;
}

/** Costura saliente hacia Agenda (TUR-025): disponibilidad real del profesional (RN09/RN19). */
@Injectable()
export class AgendaClient {
  private readonly logger = new Logger(AgendaClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'AGENDA_API_URL',
      'http://localhost:4000/api',
    );
  }

  /**
   * `GET /api/agenda/:profId/disponibilidad`. `null` cuando la costura
   * degrada: el llamador decide si valida igual (lenient) o rechaza (strict).
   */
  async disponibilidad(
    profesionalId: string,
    servicioId: string,
    fecha: string,
  ): Promise<SlotDisponible[] | null> {
    const res = await getOrDegrade<SlotDisponible[]>(
      this.http,
      `${this.baseUrl}/agenda/${profesionalId}/disponibilidad?servicioId=${servicioId}&fecha=${fecha}`,
    );
    if (res.kind === 'ok') return res.data;
    this.logger.warn(
      `No se pudo validar disponibilidad de ${profesionalId} en ${fecha} (TUR-002): disponibilidadNoValidada.`,
    );
    return null;
  }
}
