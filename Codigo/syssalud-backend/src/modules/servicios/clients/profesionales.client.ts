import { Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ProfesionalResumen } from '@syssalud/shared-types';

/**
 * Cliente HTTP dedicado al módulo Profesionales
 *
 * SER-021: Implementa la costura REST con degradación elegante
 * SER-022: Fallback documentado + logging WARN
 * SER-023: Validación delegada a la costura
 */
@Injectable()
export class ProfesionalesClient {
  private readonly logger = new Logger(ProfesionalesClient.name);
  private readonly baseUrl: string;
  private readonly modoValidacion: 'lenient' | 'strict';
  private readonly timeoutMs = 2000;
  private lastCheck: { ok: boolean; timestamp: number } = { ok: false, timestamp: 0 };

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('services.profesionalesApiUrl') || 'http://localhost:4000/api';
    this.modoValidacion = this.configService.get<'lenient' | 'strict'>('services.validarProfesionales') || 'lenient';
  }

  async resumenPorIds(ids: string[]): Promise<ProfesionalResumen[]> {
    if (ids.length === 0) return [];

    try {
      const response = await this.httpService.axiosRef.get(`${this.baseUrl}/profesionales`, {
        params: { ids: ids.join(',') },
        timeout: this.timeoutMs,
      });

      this.lastCheck = { ok: true, timestamp: Date.now() };
      const data: ProfesionalResumen[] = response.data;

      return ids.map(id =>
        data.find(p => p.id === id) || { id, nombreCompleto: null, activo: null }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Desconocido';
      this.logger.warn(`Profesionales API no disponible (${this.baseUrl}): ${errorMessage}`);
      this.lastCheck = { ok: false, timestamp: Date.now() };

      if (this.modoValidacion === 'strict') {
        throw new Error('Profesionales no disponible en modo strict');
      }

      return ids.map(id => ({ id, nombreCompleto: null, activo: null }));
    }
  }

  async existenYSonProfesionales(ids: string[]): Promise<{ validos: string[]; invalidos: string[] }> {
    const resumos = await this.resumenPorIds(ids);

    if (this.modoValidacion === 'strict' && !this.lastCheck.ok) {
      throw new Error('Costura Profesionales no disponible en modo strict');
    }

    const validos = resumos.filter(p => p.nombreCompleto !== null).map(p => p.id);
    const invalidos = resumos.filter(p => p.nombreCompleto === null).map(p => p.id);

    return { validos, invalidos };
  }

  getEstado(): { reachable: boolean; modo: string; lastCheck: number } {
    return {
      reachable: this.lastCheck.ok,
      modo: this.modoValidacion,
      lastCheck: this.lastCheck.timestamp,
    };
  }

  get estado(): { reachable: boolean; modo: string; lastCheck: number } {
    return this.getEstado();
  }
}