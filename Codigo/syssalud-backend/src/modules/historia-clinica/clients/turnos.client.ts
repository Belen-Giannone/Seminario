import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TurnoAsistido {
  idTurno: string;
  fecha: string;
}

/**
 * Costura REST hacia Turnos (HCL-018). Reenvía el JWT del profesional.
 * Ante error de red / HTTP lanza, para que el service aplique lenient/strict.
 */
@Injectable()
export class TurnosClient {
  private readonly logger = new Logger(TurnosClient.name);

  constructor(private readonly config: ConfigService) {}

  async turnosAsistidos(
    pacienteId: string,
    profesionalId: string,
    authorization: string,
  ): Promise<TurnoAsistido[]> {
    const query = new URLSearchParams({
      pacienteId,
      profesionalId,
      estado: 'ASISTIDO',
    });
    try {
      const response = await fetch(`${this.baseUrl()}/turnos?${query}`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error('Respuesta inválida de Turnos');
      return body as TurnoAsistido[];
    } catch (error) {
      this.logger.warn(
        `Turnos no disponible: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      throw error;
    }
  }

  /** Readiness para `_estado` (HCL-004). */
  async disponible(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl()}/turnos/_estado`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private baseUrl(): string {
    return this.config.get<string>(
      'TURNOS_API_URL',
      'http://localhost:4000/api',
    );
  }
}
