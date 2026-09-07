# SysSalud — Arquitectura común de los módulos

Documento de referencia compartido por todos los `docs/modulo-*-requerimientos.md`.
Cada módulo repite en su propio documento los requerimientos transversales (con su prefijo de tag)
para ser autocontenido, pero la explicación de fondo vive acá.

## Estrategia: módulos independientes con costuras REST cableadas

Cada módulo se desarrolla **de forma independiente**. Donde un módulo necesita datos de otro, se deja
**la conexión REST lista y cableada aunque el módulo destino todavía no exista o no responda**:

- El módulo arranca y **todos sus endpoints propios funcionan** aunque sus dependencias estén caídas.
- La dependencia se implementa como un **cliente HTTP dedicado** (`*Client`) que apunta al endpoint REST
  público del otro módulo, con base URL por variable de entorno.
- **Degradación elegante**: ante error de red / `404` / timeout, la costura devuelve un fallback
  documentado y registra `WARN`; el endpoint propio no falla.
- Un flag `<MODULO>_VALIDAR_<DEP>=lenient|strict` (default `lenient` mientras la dependencia no exista,
  `strict` cuando esté lista) decide si la ausencia de la dependencia degrada o bloquea (`424` / `503`).
- El contrato de cada costura (tipos + fixture de ejemplo) vive en `packages/shared-types`, así ambos
  lados programan contra la misma forma. Cuando el módulo destino esté listo: **solo se apunta la URL**
  y se pasa a `strict`, sin cambios de código.
- **Sin acoplamiento en proceso**: ningún feature module importa el `*Service` ni las entidades de otro
  feature module. `*.module.ts` sólo declara sus propios providers + `HttpModule` + `shared/`.
- `GET /api/<modulo>/_estado` reporta la salud de cada dependencia y el modo de validación.

> **Nota sobre los TODO actuales de los stubs.** Varios `*.service.ts` de la rama actual dicen
> "inyectar XService (nunca el repository)" o "nunca HTTP interno". Esa guía queda **reemplazada** por
> esta decisión: la comunicación entre módulos es por costura REST. Actualizar esos JSDoc es un
> requerimiento de cada módulo.

## Convenciones del repo a respetar

- Backend NestJS + TypeORM + PostgreSQL, `synchronize: true` (sin migraciones formales todavía),
  prefijo global `/api`, `ValidationPipe` con `whitelist` + `forbidNonWhitelisted`.
- Tipos compartidos en `packages/shared-types` con **exports explícitos** en `src/index.ts` (no `export *`).
- DTOs de request en shared-types como `interface`; clases con `class-validator` en el backend que las `implements`.
- RBAC con `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` (`src/shared/guards`, `src/shared/decorators`).
- Roles (`Rol` enum): `PACIENTE`, `ASISTENTE`, `PROFESIONAL`, `DUENO` (RN01).
- JSDoc en español, referenciando CUU/RN, igual que el módulo Auth.
- Frontend React + Vite, cliente HTTP centralizado en `syssalud-frontend/src/lib/api.ts`.
- Seed idempotente en `src/database/seed.ts`; entidades nuevas se agregan al array de `data-source.ts`.

## Mapa de casos de uso → módulos

| CUU | Nombre | Módulo(s) | Actor primario |
|---|---|---|---|
| CUU01 | Registrar paciente | pacientes (+ auth para autorregistro) | Asistente / Paciente |
| CUU02 | Solicitar turno | turnos (+ pagos, agenda, notificaciones) | Paciente |
| CUU03 | Cancelar turno | turnos (+ pagos, notificaciones) | Paciente / Asistente |
| CUU04 | Reprogramar turno | turnos (+ agenda, notificaciones) | Paciente / Asistente |
| CUU05 | Consultar agenda | agenda | Profesional / Asistente |
| CUU06 | Generar comprobante de turno | pagos | Paciente |
| CUU07 | Visualizar métricas del negocio | metricas-negocio | Dueño |
| CUU08 | Visualizar métricas de desempeño | metricas-desempeno | Profesional |
| CUU09 | Gestionar historia clínica | historia-clinica | Profesional |
| CUU10 | Mantener catálogo de servicios | servicios | Asistente |
| — | Login / IAM (RN04, RN05) | auth | Todos |
| — | Alta y horarios de profesionales | profesionales | Asistente / Dueño |
| — | Notificaciones (RN16, RN18) | notificaciones | Transversal |

## Reglas de negocio (RN) — texto abreviado

RN01 roles: Paciente / Asistente / Profesional / Dueño ·
RN02 la HC es propiedad exclusiva del paciente ·
RN03 turno = servicio + profesional + fecha + hora ·
RN04 sólo acceden usuarios registrados ·
RN05 login exige credenciales válidas ·
RN06 no se solicita turno sin registro previo ·
RN07 turnos sólo lunes a viernes ·
RN08 no hay turnos en feriados / no laborables ·
RN09 turno sólo si el horario está libre en la agenda del profesional ·
RN10 la HC sólo la ve/edita el profesional; ningún otro rol ·
RN11 medios de pago: tarjeta crédito/débito, transferencia, billetera virtual ·
RN12 el paciente no cancela/reprograma con < 24 h ·
RN13 el administrativo no tiene restricción de tiempo ·
RN14 reportes financieros y métricas globales: sólo el Dueño ·
RN15 el profesional sólo ve sus propias métricas ·
RN16 pago exitoso ⇒ confirma turno + comprobante + notificación ·
RN17 turno nuevo/confirmado ⇒ actualizar agenda del profesional ·
RN18 turno modificado/reprogramado/cancelado ⇒ notificar al paciente + liberar agenda ·
RN19 agenda sin horarios ⇒ el turno no puede concretarse ·
RN20 pago rechazado ⇒ turno "no confirmado" ·
RN21 cancelación/reprogramación con > 24 h ⇒ actualizar estado del pago ·
RN22 el plazo límite se calcula restando 24 h exactas a la fecha/hora de la cita ·
RN23 el reembolso ajusta el estado del pago original para que la asistente haga la devolución.
