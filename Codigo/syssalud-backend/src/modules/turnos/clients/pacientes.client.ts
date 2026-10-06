import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PacienteResumen } from '@syssalud/shared-types';
import { getOrDegrade } from './http-result.util';

/**
 * Costura saliente hacia Pacientes (TUR-022). RN06: sólo pacientes
 * registrados pueden solicitar un turno.
 */
@Injectable()
export class PacientesClient {
  private readonly logger = new Logger(PacientesClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'PACIENTES_API_URL',
      'http://localhost:4000/api',
    );
  }

  /** `GET /api/pacientes/:id/registrado`. `null` si la costura degrada. */
  async estaRegistrado(pacienteId: string): Promise<boolean | null> {
    const res = await getOrDegrade<{ registrado: boolean }>(
      this.http,
      `${this.baseUrl}/pacientes/${pacienteId}/registrado`,
    );
    if (res.kind === 'ok') return res.data.registrado;
    if (res.kind === 'not-found') return false;
    this.logger.warn(
      `No se pudo validar el registro del paciente ${pacienteId} (TUR-002).`,
    );
    return null;
  }

  /** `GET /api/pacientes?buscar=` (CUU02 alt 1.a). */
  async buscar(criterio: string): Promise<PacienteResumen[]> {
    const res = await getOrDegrade<PacienteResumen[]>(
      this.http,
      `${this.baseUrl}/pacientes?buscar=${encodeURIComponent(criterio)}`,
    );
    if (res.kind === 'ok') return res.data;
    this.logger.warn(`No se pudo buscar pacientes (TUR-002): "${criterio}".`);
    return [];
  }

  /** `GET /api/pacientes/por-usuario/:usuarioId`: resuelve el perfil del PACIENTE logueado. */
  async porUsuario(usuarioId: string): Promise<{ id: string } | null> {
    const res = await getOrDegrade<{ id: string }>(
      this.http,
      `${this.baseUrl}/pacientes/por-usuario/${usuarioId}`,
    );
    if (res.kind === 'ok') return { id: res.data.id };
    return null;
  }
}
