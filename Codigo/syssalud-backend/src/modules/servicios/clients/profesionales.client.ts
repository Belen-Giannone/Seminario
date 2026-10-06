import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ProfesionalDelServicio,
  ProfesionalResumen,
} from '@syssalud/shared-types';
import { firstValueFrom } from 'rxjs';
import { headersDeAutorizacion } from '../../../shared/request-context';

export type ModoValidacion = 'lenient' | 'strict';

export interface ValidacionProfesionales {
  /** `false` si la costura no respondió: no se pudo verificar nada. */
  verificado: boolean;
  validos: string[];
  /** Ids inexistentes o de profesionales inactivos. */
  invalidos: string[];
}

/**
 * Costura REST hacia Profesionales (SER-021/SER-022).
 * `GET /api/profesionales?ids=` reenviando el JWT del request (Profesionales
 * exige `JwtAuthGuard`). Nunca lanza: ante error devuelve el fallback y deja
 * que el service aplique el modo `lenient|strict` (SER-023).
 */
@Injectable()
export class ProfesionalesClient {
  private readonly logger = new Logger(ProfesionalesClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  get modoValidacion(): ModoValidacion {
    return this.config.get<string>('SERVICIOS_VALIDAR_PROFESIONALES') ===
      'strict'
      ? 'strict'
      : 'lenient';
  }

  private get baseUrl(): string {
    return this.config.get<string>(
      'PROFESIONALES_API_URL',
      'http://localhost:4000/api',
    );
  }

  /** Profesionales por id; `null` si la costura no respondió. */
  private async buscarPorIds(
    ids: string[],
  ): Promise<ProfesionalResumen[] | null> {
    if (ids.length === 0) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get<ProfesionalResumen[]>(`${this.baseUrl}/profesionales`, {
          params: { ids: ids.join(',') },
          headers: headersDeAutorizacion(),
          timeout: 2000,
        }),
      );
      if (!Array.isArray(data)) throw new Error('respuesta inválida');
      return data;
    } catch (error) {
      this.logger.warn(
        `Profesionales API no disponible (${this.baseUrl}): ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return null;
    }
  }

  /** SER-024: datos best-effort; si la costura cae, al menos los ids. */
  async resumenPorIds(ids: string[]): Promise<ProfesionalDelServicio[]> {
    const encontrados = await this.buscarPorIds(ids);
    return ids.map((id) => encontrados?.find((p) => p.id === id) ?? { id });
  }

  /** SER-023: separa ids válidos (existen y están activos) de inválidos. */
  async existenYSonProfesionales(
    ids: string[],
  ): Promise<ValidacionProfesionales> {
    const encontrados = await this.buscarPorIds(ids);
    if (encontrados === null)
      return { verificado: false, validos: [], invalidos: [] };
    const activos = new Set(
      encontrados.filter((p) => p.activo).map((p) => p.id),
    );
    return {
      verificado: true,
      validos: ids.filter((id) => activos.has(id)),
      invalidos: ids.filter((id) => !activos.has(id)),
    };
  }

  /** SER-005: readiness real de Profesionales. */
  async disponible(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.get(`${this.baseUrl}/profesionales/_estado`, {
          timeout: 2000,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
