import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Paciente, PacienteResumen } from '@syssalud/shared-types';

/** Datos personales que la HC muestra (`nomAppPac`, `telefono`, `correo`). */
export type PacienteDetalle = Pick<
  Paciente,
  'id' | 'nombre' | 'apellido' | 'telefono' | 'email'
>;

/**
 * Costura REST hacia Pacientes (HCL-017). Reenvía el JWT del profesional
 * porque Pacientes exige `JwtAuthGuard` en el buscador y en el detalle.
 * Ante error de red / HTTP lanza, para que el service aplique lenient/strict.
 */
@Injectable()
export class PacientesClient {
  private readonly logger = new Logger(PacientesClient.name);

  constructor(private readonly config: ConfigService) {}

  async buscar(
    criterio: string,
    authorization: string,
  ): Promise<PacienteResumen[]> {
    const response = await this.get(
      `/pacientes?buscar=${encodeURIComponent(criterio)}`,
      authorization,
    );
    const body: unknown = await response.json();
    if (!Array.isArray(body)) {
      this.logger.warn('Pacientes devolvió una respuesta inesperada');
      throw new Error('Respuesta inválida de Pacientes');
    }
    return body as PacienteResumen[];
  }

  /** `null` si Pacientes responde 404 (el paciente no está registrado). */
  async obtener(
    id: string,
    authorization: string,
  ): Promise<PacienteDetalle | null> {
    const response = await this.get(
      `/pacientes/${encodeURIComponent(id)}`,
      authorization,
      true,
    );
    if (response.status === 404) return null;
    return (await response.json()) as PacienteDetalle;
  }

  /** Readiness para `_estado` (HCL-004). */
  async disponible(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl()}/pacientes/_estado`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private baseUrl(): string {
    return this.config.get<string>(
      'PACIENTES_API_URL',
      'http://localhost:4000/api',
    );
  }

  private async get(
    path: string,
    authorization: string,
    allowNotFound = false,
  ): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl()}${path}`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok && !(allowNotFound && response.status === 404)) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      this.logger.warn(
        `Pacientes no disponible: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      throw error;
    }
  }
}
