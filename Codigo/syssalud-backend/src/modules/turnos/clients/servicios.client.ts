import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getOrDegrade } from './http-result.util';

export interface ServicioResumen {
  nombre: string;
  duracionMin: number;
  precio: number;
  activo: boolean;
}

/** Costura saliente hacia Servicios (TUR-023): duración y precio del servicio. */
@Injectable()
export class ServiciosClient {
  private readonly logger = new Logger(ServiciosClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'SERVICIOS_API_URL',
      'http://localhost:4000/api',
    );
  }

  /** `GET /api/servicios/:id`. `null` si no existe o la costura degrada. */
  async obtener(servicioId: string): Promise<ServicioResumen | null> {
    const res = await getOrDegrade<ServicioResumen>(
      this.http,
      `${this.baseUrl}/servicios/${servicioId}`,
    );
    if (res.kind === 'ok') return res.data;
    if (res.kind === 'not-found') return null;
    this.logger.warn(
      `No se pudo obtener el servicio ${servicioId} (TUR-002): se usa monto 0 provisorio.`,
    );
    return null;
  }

  /** `GET /api/servicios/:id/profesionales`. Lista vacía si la costura degrada. */
  async profesionalesDe(servicioId: string): Promise<string[]> {
    const res = await getOrDegrade<Array<{ id: string }>>(
      this.http,
      `${this.baseUrl}/servicios/${servicioId}/profesionales`,
    );
    if (res.kind === 'ok') return res.data.map((p) => p.id);
    return [];
  }
}
