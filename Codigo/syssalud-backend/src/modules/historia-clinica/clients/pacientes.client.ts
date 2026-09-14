import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PacienteResumen {
  id: string;
  nombre?: string;
  apellido?: string;
  nombreCompleto?: string;
  dni?: string | null;
}

export interface PacienteDetalle extends PacienteResumen {
  telefono?: string | null;
  email?: string | null;
}

@Injectable()
export class PacientesClient {
  private readonly logger = new Logger(PacientesClient.name);

  constructor(private readonly config: ConfigService) {}

  async buscar(criterio: string): Promise<PacienteResumen[]> {
    const response = await this.get(`/pacientes?buscar=${encodeURIComponent(criterio)}`);
    return (await response.json()) as PacienteResumen[];
  }

  async obtener(id: string): Promise<PacienteDetalle | null> {
    const response = await this.get(`/pacientes/${encodeURIComponent(id)}`, true);
    if (response.status === 404) return null;
    return (await response.json()) as PacienteDetalle;
  }

  private async get(path: string, allowNotFound = false): Promise<Response> {
    const baseUrl = this.config.get<string>('PACIENTES_API_URL', 'http://localhost:4000/api');
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok && !(allowNotFound && response.status === 404)) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      this.logger.warn(`Pacientes no disponible: ${error instanceof Error ? error.message : 'error desconocido'}`);
      throw error;
    }
  }
}