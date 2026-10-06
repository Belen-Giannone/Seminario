<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Módulo Historia Clínica (`/api/historia-clinica`)

CUU09 — Gestionar historia clínica. **Acceso exclusivo del rol `PROFESIONAL`** (RN10); la HC es propiedad del paciente y hay una sola por paciente (RN02). El módulo no tiene consumidores REST por diseño: ningún otro módulo lee la HC.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/_estado` | Readiness de las costuras Pacientes/Turnos y modo de validación (sin datos clínicos) |
| GET | `/?dni=` o `/?nombre=&apellido=` | Busca el paciente y devuelve su HC, `{ existe:false }` o la lista para desambiguar |
| GET | `/:pacienteId` | HC completa del paciente |
| POST | `/:pacienteId` | Inicializa la HC en blanco (idempotente) |
| POST | `/:pacienteId/entradas` | Agrega una entrada (append-only) |

Variables de entorno: `PACIENTES_API_URL`, `TURNOS_API_URL`, `HISTORIA_VALIDAR_TURNOS` (`lenient` por defecto | `strict`). Ver `docs/modulo-historia-clinica-requerimientos.md`.

## Módulo Turnos (`/api/turnos`)

CUU02 — Solicitar turno · CUU03 — Cancelar turno · CUU04 — Reprogramar turno. Orquesta las 6 costuras salientes (Pacientes, Servicios, Profesionales, Agenda, Pagos, Notificaciones) sin acoplamiento en proceso (TUR-001): todo por REST, con degradación elegante cuando una costura no responde.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/_estado` | Readiness de las 6 costuras y modo de validación |
| POST | `/` | Solicita un turno (CUU02 pasos 3-4): valida RN06/RN07/RN09/RN19, calcula el monto, reserva en `SOLICITADO` |
| POST | `/:id/pago` | Paga y confirma (CUU02 paso 5, RN11/RN16/RN20); idempotente por `idTransaccion` |
| GET | `/` | Listado filtrado por rol (`?pacienteId=&profesionalId=&estado=&desde=&hasta=`); la consumen Agenda, Historia Clínica y Métricas |
| GET | `/mis-turnos` | Atajo del paciente: sus turnos vigentes (`turnos_vigentes`) |
| GET | `/:id` | Detalle (403 si no es propio) |
| POST | `/:id/cancelar` | CUU03: RN12/RN13/RN22 (plazo de 24h para el paciente), ajusta reembolso (RN21/RN23) |
| POST | `/:id/reprogramar` | CUU04: mismo servicio/profesional, RN12/RN13 + disponibilidad |
| POST | `/:id/asistencia` | Marca `ASISTIDO` (precondición de Historia Clínica y Métricas) |

Nota de diseño: los flags `lenient`/`strict` sólo rigen cuando una costura está **caída** (timeout/conexión); una respuesta explícita de una costura que sí contesta (p. ej. "paciente no registrado", "slot ocupado") siempre se respeta. Profesionales/Servicios son siempre best-effort (sin flag propio).

Variables de entorno: `PACIENTES_API_URL`, `SERVICIOS_API_URL`, `PROFESIONALES_API_URL`, `AGENDA_API_URL`, `PAGOS_API_URL`, `NOTIFICACIONES_API_URL`, `TURNOS_VALIDAR_AGENDA`, `TURNOS_VALIDAR_PACIENTES` (`lenient` por defecto | `strict`), `TURNOS_RESERVA_MIN` (default 15). Ver `docs/modulo-turnos-requerimientos.md`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
