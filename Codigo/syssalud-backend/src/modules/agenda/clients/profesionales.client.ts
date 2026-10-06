import { Injectable, Logger } from '@nestjs/common';
import type { HorarioAtencion, Profesional } from '@syssalud/shared-types';
import { fetchJson } from './http.util';

export type ExistenciaProfesional =
  | { estado: 'si'; nombre: string | null }
  | { estado: 'no' }
  | { estado: 'desconocido' };

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
      `${this.baseUrl}/profesionales/${encodeURIComponent(profesionalId)}/horarios`,
    );
    if (res.kind === 'ok') {
      return res.data;
    }
    this.logger.warn(
      `No se pudieron obtener horarios del profesional ${profesionalId} (AGE-002): disponibilidad vacía.`,
    );
    return null;
  }

  /** `GET /api/profesionales/:id`. Distingue "no existe" de "costura caída" y trae el nombre. */
  async existe(profesionalId: string): Promise<ExistenciaProfesional> {
    const res = await fetchJson<Pick<Profesional, 'id' | 'nombreCompleto'>>(
      `${this.baseUrl}/profesionales/${encodeURIComponent(profesionalId)}`,
    );
    if (res.kind === 'ok') {
      return { estado: 'si', nombre: res.data.nombreCompleto ?? null };
    }
    if (res.kind === 'not-found') {
      return { estado: 'no' };
    }
    this.logger.warn(
      `No se pudo validar la existencia del profesional ${profesionalId} (AGE-002).`,
    );
    return { estado: 'desconocido' };
  }

  /**
   * `GET /api/profesionales/por-usuario/:usuarioId`: el `Profesional.id` del
   * usuario logueado (el `sub` del JWT es el id de `Usuario`, no del profesional).
   * `undefined` si la costura no responde; `null` si el usuario no es profesional.
   */
  async idPorUsuario(usuarioId: string): Promise<string | null | undefined> {
    const res = await fetchJson<{ id: string }>(
      `${this.baseUrl}/profesionales/por-usuario/${encodeURIComponent(usuarioId)}`,
    );
    if (res.kind === 'ok') return res.data.id;
    if (res.kind === 'not-found') return null;
    this.logger.warn(
      `No se pudo resolver el profesional del usuario ${usuarioId} (AGE-002).`,
    );
    return undefined;
  }
}
