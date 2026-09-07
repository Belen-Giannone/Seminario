# Módulo Notificaciones — Requerimientos para el desarrollo completo

**Cubre:** todos los `notif_*` de los diccionarios de datos (registro de paciente, confirmación, cancelación y reprogramación de turno, envío de comprobante). Módulo **transversal**, sin CUU propio.
**Pareja responsable:** Pareja D (Pagos & Notificaciones).
**Estado actual:** parcial. `notificaciones.module.ts`, `notificaciones.controller.ts` con `GET /notificaciones` de ping, `notificaciones.service.ts` con un método `enviar(email, mensaje)` que **sólo loguea** y `estado()`. Sin entidad, sin endpoint de emisión REST, sin bitácora, sin plantillas, sin RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- RN16: pago exitoso ⇒ confirma turno, emite comprobante y **envía notificación automática al usuario**.
- RN18: turno modificado/reprogramado/cancelado ⇒ **enviar notificación de alerta al paciente** (y liberar agenda).
- CUU01: al registrar un paciente, notificar a ADM y PAC (`notif_reg_pac = "Paciente registrado. Detalles:" + nom_pac + id_pac`).
- CUU06: enviar el comprobante a PAC y ADM.
- Plantillas del diccionario:
  - `notif_reg_pac` — "Paciente registrado. Detalles:" + nombre + id
  - `notif_conf` — "Turno confirmado. Detalles:" + nom_prof + nom_serv + fecha + hora + nom_pac
  - `notif_canc` — "Turno cancelado. Detalles." + nom_prof + nom_serv + fecha + hora + nom_pac
  - `notif_reprog` — "Turno Reprogramado. Detalles:" + nom_prof + nom_serv + fecha + hora + nom_pac
  - `comp_turno` (envío de comprobante) — turno + monto
- Alcance del TP: **no hace falta enviar emails/SMS reales**; alcanza con registrar y loguear. Dejar la interfaz lista para un canal real.

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Proveedor de email/SMS (opcional) | envío real | `CanalEnvio` con impl `LogCanal` (default) y `EmailCanal` (opcional) |
| **Entrante** | Pacientes, Turnos, Pagos | emitir una notificación con una plantilla y datos | `POST /api/notificaciones` |

Notificaciones **no llama a otros módulos de negocio**: recibe todo lo que necesita en el request (destinatarios + datos ya resueltos: nombres, fecha, hora, monto). Esto la mantiene independiente y evita ciclos.

---

## 1. Principios de arquitectura

### NOT-001 — Sin acoplamiento en proceso
Notificaciones no importa services/entidades de otros feature modules y no llama a sus APIs para "enriquecer": el emisor manda los datos listos. La única costura saliente es el `CanalEnvio` (infra).

### NOT-002 — Degradación elegante
Si el canal real falla o no está configurado, la notificación se persiste con `estado = PENDIENTE` y se loguea; nunca hace fallar la operación de negocio del emisor. Un reintento (`NOT-016`) reprocesa las pendientes.

### NOT-003 — Contratos compartidos
`Notificacion`, `EmitirNotificacionRequest`, `TipoNotificacion` (enum), `CanalNotificacion` (enum) en `packages/shared-types` con fixture.

### NOT-004 — Readiness observable
`GET /api/notificaciones/_estado` → `{ modulo:'notificaciones', canal, pendientes: <n> }`.

### NOT-005 — Actualizar el JSDoc del stub
El `TODO (Pareja D)` ya apunta bien ("alcanza con loggear"); ampliarlo con: endpoint REST de emisión + bitácora persistida + plantillas.

---

## 2. Modelo de datos y persistencia

### NOT-006 — Entidad `Notificacion` (bitácora)
`notificaciones`: `id` (uuid), `tipo` (`TipoNotificacion`: `REGISTRO_PACIENTE` | `TURNO_CONFIRMADO` | `TURNO_CANCELADO` | `TURNO_REPROGRAMADO` | `COMPROBANTE`), `canal` (`LOG` | `EMAIL` | `SMS`), `destinatarioEmail` (string), `destinatarioRol` (`PACIENTE` | `ASISTENTE` | ...), `asunto` (string), `cuerpo` (text), `datos` (jsonb con las variables de la plantilla), `estado` (`PENDIENTE` | `ENVIADA` | `FALLIDA`), `referencia` (string: `pacienteId` / `turnoId` / `pagoId` que la originó), `creadaEn`, `enviadaEn` (nullable), `intentos` (int).

### NOT-007 — Registrar entidad
`TypeOrmModule.forFeature([Notificacion])` + `Notificacion` en `data-source.ts`.

### NOT-008 — Retención
La bitácora se conserva (útil para pruebas y auditoría). Sin borrado automático en el alcance del TP.

---

## 3. Contratos compartidos (`packages/shared-types`)

### NOT-009 — DTOs
- `EmitirNotificacionRequest`: `{ tipo: TipoNotificacion; destinatarios: { email: string; rol: Rol }[]; datos: Record<string,string|number>; referencia?: string }`.
- `Notificacion`: campos de NOT-006 relevantes para lectura.
- `TipoNotificacion`, `CanalNotificacion` como enums exportados.

### NOT-010 — Exportar
`export type { ... }` / `export { ... }` en `src/index.ts` + `notificacionFixture`.

---

## 4. API — endpoints que Notificaciones expone

### NOT-011 — `POST /api/notificaciones` — emitir
`EmitirNotificacionRequest`. Renderiza la plantilla del `tipo` con `datos`, crea una `Notificacion` por destinatario, intenta enviar por el `CanalEnvio` configurado, responde `202` con los ids y el `estado` de cada una.
**RBAC:** autenticado (lo llaman Pacientes/Turnos/Pagos con el JWT del actor que disparó la operación). Opción más estricta: `@Roles` de los roles que operan esos flujos (`ASISTENTE`, `PACIENTE`, `PROFESIONAL`).

### NOT-012 — `GET /api/notificaciones` — bitácora
Query `?destinatario=&tipo=&estado=&referencia=&desde=&hasta=`. Devuelve `Notificacion[]` paginado. Sirve para verificar en pruebas y para un panel del asistente.
**RBAC:** `@Roles(Rol.ASISTENTE, Rol.DUENO)`; un usuario puede ver `?destinatario=<su email>` propio.

### NOT-013 — `GET /api/notificaciones/:id` — detalle
`Notificacion`. `404` si no existe.

### NOT-014 — `POST /api/notificaciones/:id/reintentar` — reenvío
Reintenta una `PENDIENTE`/`FALLIDA`. `@Roles(Rol.ASISTENTE)`.

### NOT-015 — Reubicar el ping
`GET /api/notificaciones` pasa a ser la bitácora (NOT-012); el `estado()` va a `GET /api/notificaciones/_estado` (NOT-004).

---

## 5. Plantillas y canal de envío

### NOT-016 — Plantillas (una por `TipoNotificacion`)
Textos fijos del diccionario + interpolación de `datos`:
- `REGISTRO_PACIENTE`: asunto "Registro exitoso" · cuerpo "Paciente registrado. Detalles: {nombre} (N° {numeroPaciente})".
- `TURNO_CONFIRMADO`: "Turno confirmado. Detalles: {servicio} con {profesional} el {fecha} a las {hora}. Paciente: {paciente}."
- `TURNO_CANCELADO`: "Turno cancelado. Detalles. {servicio} con {profesional} del {fecha} {hora}. Paciente: {paciente}."
- `TURNO_REPROGRAMADO`: "Turno Reprogramado. Detalles: {servicio} con {profesional}, nueva fecha {fecha} {hora}. Paciente: {paciente}."
- `COMPROBANTE`: "Comprobante {numero}. {servicio} con {profesional} el {fecha} {hora}. Monto: {monto}."
Faltar una variable requerida → `400` con el nombre de la variable.

### NOT-017 — `CanalEnvio` (infra, no feature module)
Interfaz `enviar(notificacion): Promise<{ ok: boolean; detalle?: string }>`. Implementaciones:
- `LogCanal` (default): escribe en el `Logger` y marca `ENVIADA`.
- `EmailCanal` (opcional, fuera del alcance mínimo): SMTP por env; si falla → `FALLIDA` + `PENDIENTE` para reintento.
Selección por `NOTIF_CANAL=log|email`.

### NOT-018 — Reintento de pendientes
Comando/endpoint (NOT-014) y opcionalmente un cron simple que reprocesa `PENDIENTE`/`FALLIDA` con back-off e `intentos++`.

---

## 6. Reglas de negocio

### NOT-019 — Cobertura de eventos (RN16, RN18, CUU01, CUU06)
Debe existir una plantilla y un disparo para: alta de paciente (→ PAC y ADM), turno confirmado (→ PAC), turno cancelado (→ PAC y ADM), turno reprogramado (→ PAC y ADM), comprobante (→ PAC y ADM).

### NOT-020 — Idempotencia por referencia + tipo + destinatario
Emisiones repetidas con la misma `(referencia, tipo, destinatarioEmail)` en una ventana corta no duplican el envío (protege ante reintentos del emisor).

### NOT-021 — No bloquear al emisor
`POST /api/notificaciones` responde rápido (`202`) aunque el canal sea lento; el envío puede completarse async. El emisor nunca depende del resultado para su propia respuesta.

---

## 7. Seguridad y control de acceso

### NOT-022 — RBAC por endpoint
Emitir: autenticado (actor del flujo). Bitácora global: `ASISTENTE`, `DUENO`. Detalle/propias: el destinatario. Reintento: `ASISTENTE`. `_estado`: sin rol.

### NOT-023 — Datos mínimos
El `cuerpo` no incluye datos clínicos (RN10) ni datos de pago sensibles. Sólo lo que las plantillas del diccionario definen.

---

## 8. Consumidores de Notificaciones

### NOT-024 — Vía REST
Pacientes (`notif_reg_pac`), Turnos (`notif_conf` / `notif_canc` / `notif_reprog`), Pagos (`COMPROBANTE`). Cada uno con su `NotificacionesClient` que degrada a log local si el módulo no responde.

---

## 9. Frontend

### NOT-025 — Toasts en pantallas de éxito
Las pantallas de confirmación / cancelación / reprogramación / registro muestran el mensaje de la plantilla como confirmación en pantalla (no requieren consultar este módulo, pero el texto debe coincidir).

### NOT-026 — Panel de bitácora (perfil ASISTENTE) — opcional
Tabla de notificaciones con filtros por tipo/estado/destinatario y acción "Reintentar".

### NOT-027 — Métodos de API
`lib/api.ts`: `notificaciones.listar`, `notificaciones.obtener`, `notificaciones.reintentar`. (La emisión la hacen los backends, no el frontend.)

---

## 10. Configuración

### NOT-028 — Variables de entorno
`NOTIF_CANAL` (`log`|`email`, default `log`), y si `email`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIF_FROM`. Documentar en `README.md` y `.env`.

---

## 11. Pruebas

### NOT-029 — Unit `NotificacionesService`
Render de cada plantilla con datos; variable faltante → `400`; `LogCanal` marca `ENVIADA`; canal que falla → `PENDIENTE`; idempotencia por `(referencia, tipo, destinatario)`.

### NOT-030 — Controller / RBAC
PACIENTE no ve la bitácora global (`403`); sí ve `?destinatario=<su email>`.

### NOT-031 — e2e transversal
Ejecutar los flujos de Pacientes/Turnos/Pagos y verificar en `GET /api/notificaciones?referencia=` que se registró la notificación correcta con el texto del diccionario.

---

## 12. No funcionales y documentación

### NOT-032 — Textos exactos
Los asuntos/cuerpos deben usar literalmente los textos del diccionario ("Paciente registrado. Detalles:", "Turno confirmado. Detalles:", etc.).

### NOT-033 — Documentación
`README.md` del backend con `/api/notificaciones` y la tabla de plantillas; JSDoc referenciando RN16/RN18 y CUU01/CUU06; nota de que el canal por defecto es log y de que el módulo no llama a otros módulos de negocio.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| NOT-001…NOT-005, NOT-015, NOT-017, NOT-024 | `docs/_comun-arquitectura.md` |
| NOT-006, NOT-016, NOT-032 | `notif_reg_pac`, `notif_conf`, `notif_canc`, `notif_reprog`, `comp_turno` |
| NOT-011, NOT-019 | RN16 (notificar al confirmar), RN18 (notificar al cancelar/reprogramar), CUU01 (notificar alta), CUU06 (enviar comprobante) |
| NOT-012, NOT-026 | verificación en pruebas + panel del asistente |
| NOT-020, NOT-021 | costura entrante no bloqueante para Pacientes/Turnos/Pagos |
| NOT-023 | RN10 (sin datos clínicos) |
