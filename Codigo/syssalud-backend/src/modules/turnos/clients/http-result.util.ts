import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { headersDeAutorizacion } from '../../../shared/request-context';

/**
 * Resultado tipado de una llamada GET a una costura REST, sin lanzar nunca:
 * las costuras degradan (TUR-002) en vez de tumbar el endpoint propio.
 */
export type FetchResult<T> =
  { kind: 'ok'; data: T } | { kind: 'not-found' } | { kind: 'unreachable' };

export async function getOrDegrade<T>(
  http: HttpService,
  url: string,
): Promise<FetchResult<T>> {
  try {
    // Reenvía el JWT del request: los demás módulos exigen JwtAuthGuard.
    const res = await firstValueFrom(
      http.get<T>(url, { headers: headersDeAutorizacion() }),
    );
    return { kind: 'ok', data: res.data };
  } catch (error) {
    if ((error as AxiosError).response?.status === 404) {
      return { kind: 'not-found' };
    }
    return { kind: 'unreachable' };
  }
}
