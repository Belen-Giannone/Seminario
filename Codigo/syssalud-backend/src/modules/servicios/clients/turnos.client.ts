import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoTurno, type TurnoResumen } from '@syssalud/shared-types';
import { firstValueFrom } from 'rxjs';
import { headersDeAutorizacion } from '../../../shared/request-context';

/** Estados que todavía ocupan agenda: un servicio con turnos así no se da de baja. */
const ESTADOS_VIGENTES: string[] = [
  EstadoTurno.SOLICITADO,
  EstadoTurno.CONFIRMADO,
  EstadoTurno.REPROGRAMADO,
];

/** `YYYY-MM-DD` de hoy en la zona del consultorio. */
export function hoyLocal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Costura REST hacia Turnos (SER-019): turnos futuros de un servicio, para
 * rechazar su baja. `GET /api/turnos?servicioId=&desde=` reenviando el JWT.
 */
@Injectable()
export class TurnosClient {
  private readonly logger = new Logger(TurnosClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Cantidad de turnos vigentes desde hoy; `null` si Turnos no respondió. */
  async turnosFuturos(servicioId: string): Promise<number | null> {
    const baseUrl = this.config.get<string>(
      'TURNOS_API_URL',
      'http://localhost:4000/api',
    );
    try {
      const { data } = await firstValueFrom(
        this.http.get<TurnoResumen[]>(`${baseUrl}/turnos`, {
          params: { servicioId, desde: hoyLocal() },
          headers: headersDeAutorizacion(),
          timeout: 2000,
        }),
      );
      if (!Array.isArray(data)) throw new Error('respuesta inválida');
      return data.filter((t) => ESTADOS_VIGENTES.includes(t.estado)).length;
    } catch (error) {
      this.logger.warn(
        `Turnos API no disponible (${baseUrl}): ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return null;
    }
  }
}
