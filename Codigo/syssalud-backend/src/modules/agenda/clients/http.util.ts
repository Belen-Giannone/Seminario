/**
 * Resultado tipado de una llamada GET a una costura REST, sin lanzar nunca:
 * las costuras degradan (AGE-002) en vez de tumbar el endpoint propio.
 */
export type FetchResult<T> =
  { kind: 'ok'; data: T } | { kind: 'not-found' } | { kind: 'unreachable' };

/** GET con timeout que nunca rechaza la promesa; distingue 404 de error/timeout. */
export async function fetchJson<T>(
  url: string,
  timeoutMs = 3000,
): Promise<FetchResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 404) {
      return { kind: 'not-found' };
    }
    if (!res.ok) {
      return { kind: 'unreachable' };
    }
    return { kind: 'ok', data: (await res.json()) as T };
  } catch {
    return { kind: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
