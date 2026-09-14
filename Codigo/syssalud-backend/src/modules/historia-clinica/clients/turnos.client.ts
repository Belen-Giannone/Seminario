import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TurnoAsistido {
  idTurno: string;
  fecha: string;
}

@Injectable()
export class TurnosClient {
  private readonly logger = new Logger(TurnosClient.name);

  constructor(private readonly config: ConfigService) {}

  async turnosAsistidos(pacienteId: string, profesionalId: string): Promise<TurnoAsistido[]> {
    const baseUrl = this.config.get<string>('TURNOS_API_URL', 'http://localhost:4000/api');
    const query = new URLSearchParams({ pacienteId, profesionalId, estado: 'ASISTIDO' });
    try {
      const response = await fetch(`${baseUrl}/turnos?${query}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as TurnoAsistido[];
    } catch (error) {
      this.logger.warn(`Turnos no disponible: ${error instanceof Error ? error.message : 'error desconocido'}`);
      throw error;
    }
  }
}