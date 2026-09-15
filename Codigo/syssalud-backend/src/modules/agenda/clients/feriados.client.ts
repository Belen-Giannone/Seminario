import { Injectable, Logger } from '@nestjs/common';
import { fetchJson } from './http.util';
import { FERIADOS_2026 } from '../feriados-2026';

const DATASET_LOCAL: Record<number, string[]> = {
  2026: FERIADOS_2026,
};

/**
 * Costura de feriados nacionales (RN08, AGE-019). Si `FERIADOS_API_URL` está
 * configurada se intenta primero; ante ausencia/error se cae siempre al
 * dataset local versionado. Cachea por año en memoria.
 */
@Injectable()
export class FeriadosClient {
  private readonly logger = new Logger(FeriadosClient.name);
  private readonly url = process.env.FERIADOS_API_URL;
  private readonly cachePorAnio = new Map<number, Set<string>>();

  async deAnio(anio: number): Promise<Set<string>> {
    const cacheado = this.cachePorAnio.get(anio);
    if (cacheado) {
      return cacheado;
    }

    let fechas: string[] | null = null;
    if (this.url) {
      const res = await fetchJson<string[]>(`${this.url}?anio=${anio}`);
      if (res.kind === 'ok') {
        fechas = res.data;
      } else {
        this.logger.warn(
          `Feriados API no disponible para ${anio} (AGE-019): se usa el dataset local.`,
        );
      }
    }

    const set = new Set(fechas ?? DATASET_LOCAL[anio] ?? []);
    this.cachePorAnio.set(anio, set);
    return set;
  }

  /** Fechas entre `desde` y `hasta` (inclusive) que son feriado, cubriendo los años involucrados. */
  async enRango(desde: string, hasta: string): Promise<Set<string>> {
    const anioDesde = Number(desde.slice(0, 4));
    const anioHasta = Number(hasta.slice(0, 4));
    const resultado = new Set<string>();
    for (let anio = anioDesde; anio <= anioHasta; anio++) {
      const feriadosAnio = await this.deAnio(anio);
      for (const f of feriadosAnio) {
        resultado.add(f);
      }
    }
    return resultado;
  }
}
