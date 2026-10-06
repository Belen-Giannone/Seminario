import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOrDegrade } from './http-result.util';

export type ExistenciaProfesional = 'si' | 'no' | 'desconocido';

/** Costura saliente hacia Profesionales (TUR-024): validar existencia. */
@Injectable()
export class ProfesionalesClient {
  private readonly logger = new Logger(ProfesionalesClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'PROFESIONALES_API_URL',
      'http://localhost:4000/api',
    );
  }

  /** `GET /api/profesionales/:id`. Distingue "no existe" de "costura caída". */
  async existe(profesionalId: string): Promise<ExistenciaProfesional> {
    const res = await getOrDegrade<{ id: string }>(
      this.http,
      `${this.baseUrl}/profesionales/${profesionalId}`,
    );
    if (res.kind === 'ok') return 'si';
    if (res.kind === 'not-found') return 'no';
    this.logger.warn(
      `No se pudo validar la existencia del profesional ${profesionalId} (TUR-002).`,
    );
    return 'desconocido';
  }

  /**
   * `GET /api/profesionales/por-usuario/:usuarioId`: el `Profesional.id` del
   * usuario PROFESIONAL logueado (no coincide con el `sub` del JWT).
   */
  async porUsuario(usuarioId: string): Promise<{ id: string } | null> {
    const res = await getOrDegrade<{ id: string }>(
      this.http,
      `${this.baseUrl}/profesionales/por-usuario/${usuarioId}`,
    );
    if (res.kind === 'ok') return { id: res.data.id };
    return null;
  }
}
