/**
 * `@nestjs/axios@12` se publica sólo como ESM puro (`"type": "module"`), que
 * Jest (CJS) no puede `require`. Como ningún test necesita el `HttpService`
 * real (siempre se inyecta un mock), se sustituye automáticamente por este
 * stub — ver https://jestjs.io/docs/manual-mocks#mocking-node-modules.
 */
export class HttpService {}
export class HttpModule {}
