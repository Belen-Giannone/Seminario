import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

interface ContextoRequest {
  authorization?: string;
}

const almacenamiento = new AsyncLocalStorage<ContextoRequest>();

/**
 * Guarda el header `Authorization` del request entrante para que las costuras
 * REST lo reenvíen a los otros módulos (todos exigen `JwtAuthGuard`) sin tener
 * que pasarlo por parámetro en cada método.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    almacenamiento.run({ authorization: req.headers.authorization }, next);
  }
}

/** `Authorization` del request en curso, o `undefined` fuera de un request HTTP. */
export function authorizationActual(): string | undefined {
  return almacenamiento.getStore()?.authorization;
}

/** Headers a reenviar en una llamada entre módulos. */
export function headersDeAutorizacion(): Record<string, string> {
  const authorization = authorizationActual();
  return authorization ? { Authorization: authorization } : {};
}
