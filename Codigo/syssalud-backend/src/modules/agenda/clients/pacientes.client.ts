import { Injectable, Logger } from '@nestjs/common';
import type { Paciente } from '@syssalud/shared-types';
import { fetchJson } from './http.util';

/**
 * Costura saliente hacia Pacientes: el nombre del paciente de cada turno
 * (CUU05 muestra fecha, hora, paciente y servicio). Best-effort.
 */
@Injectable()
export class PacientesClient {
  private readonly logger = new Logger(PacientesClient.name);
  private readonly baseUrl =
    process.env.PACIENTES_API_URL || 'http://localhost:4000/api';

  /** `GET /api/pacientes/:id` por cada id distinto. Los que fallan quedan sin nombre. */
  async nombres(ids: string[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))];
    const resultados = await Promise.all(
      unicos.map(async (id) => {
        const res = await fetchJson<Pick<Paciente, 'nombre' | 'apellido'>>(
          `${this.baseUrl}/pacientes/${encodeURIComponent(id)}`,
        );
        return res.kind === 'ok'
          ? ([id, `${res.data.nombre} ${res.data.apellido}`.trim()] as const)
          : null;
      }),
    );
    const nombres = new Map<string, string>();
    for (const r of resultados) if (r) nombres.set(r[0], r[1]);
    if (nombres.size < unicos.length) {
      this.logger.warn(
        `No se pudieron resolver ${unicos.length - nombres.size} nombres de pacientes (AGE-002).`,
      );
    }
    return nombres;
  }
}
