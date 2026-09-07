# Módulo Turnos — Requerimientos para el desarrollo completo

**Casos de uso cubiertos:** CUU02 — Solicitar turno · CUU03 — Cancelar turno · CUU04 — Reprogramar turno. Es el lado escritura del par Agenda/Turnos y el **orquestador** del flujo de reserva y pago.
**Pareja responsable:** Pareja C (Agenda & Turnos).
**Estado actual:** esqueleto (`turnos.module.ts`, `turnos.controller.ts` con `GET /turnos` de ping, `turnos.service.ts` con `estado()`). Sin entidad, máquina de estados, DTOs, persistencia, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- RN03: un turno = **un servicio + un profesional + una fecha + una hora**.
- CUU02 camino básico: login → ver servicios → elegir servicio + profesional → el sistema muestra agenda disponible → elegir turno y confirmar → el sistema registra la solicitud, **calcula el monto** y habilita el pago → pagar (tarjeta / transferencia / billetera, RN11) → validar transacción y **confirmar** turno.
- CUU02 alternativos: `1.a` opera el ADM (buscador de pacientes por DNI/nombre, sigue en paso 3); `2.a` credenciales inválidas; `3.a` sin disponibilidad (RN19) → modificar criterios o cancelar; `4.a` no confirma → libera reserva temporal; `5.a` pago rechazado (RN20) → no confirma, libera el horario.
- CUU03 (cancelar): muestra turnos vigentes → elegir → registra cancelación → **devolución manual por la asistente** (RN23) → notifica a PAC y ADM → libera la agenda. `2.a` fuera de plazo (< 24 h, RN12) → no se puede cancelar; `4.a` ADM cancela en nombre del paciente (sin restricción, RN13).
- CUU04 (reprogramar): turnos vigentes → elegir → horarios alternativos **para el mismo servicio y profesional** → elegir → actualiza y registra → notifica y actualiza agenda. `2.a` sin alternativas → ofrecer cancelar (invoca CUU03); `3.a` no confirma; `4.a` ADM reprograma en nombre del paciente.
- RN06: sólo pacientes registrados. RN07/RN08: días válidos. RN09: horario libre. RN16: pago ok ⇒ confirma + comprobante + notificación. RN17: turno nuevo/confirmado ⇒ actualiza agenda. RN18: modificado/cancelado ⇒ notifica + libera agenda. RN20: pago rechazado ⇒ "no confirmado". RN21/RN22/RN23: manejo de plazo y reembolso.
- Diccionario: `turno = id_prof + id_serv + id_pac + fecha + hora + estado_t + comp_pago + monto`; `liquidacion_pago = id_pac + id_serv + id_prof + fecha + hora + monto`; `datos_pago = tipo_medio_pago + id_transaccion`; `turnos_vigentes = 1{id_turno + fecha + hora + estado}n`.
- Máquina de estados: ver "ART ME" del proyecto (referencia interna).

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Pacientes | validar registro (RN06); resolver datos; buscador (CUU02 alt 1.a) | `PacientesClient` → `GET /api/pacientes/:id/registrado`, `?buscar=` |
| **Saliente** | Servicios | duración, precio (monto), profesionales del servicio | `ServiciosClient` → `GET /api/servicios/:id`, `/:id/profesionales` |
| **Saliente** | Profesionales | validar existencia; nombre | `ProfesionalesClient` → `GET /api/profesionales/:id` |
| **Saliente** | Agenda | disponibilidad / slots libres (RN09, RN19) | `AgendaClient` → `GET /api/agenda/:profId/disponibilidad` |
| **Saliente** | Pagos | procesar pago; ajustar reembolso | `PagosClient` → `POST /api/pagos`, `POST /api/pagos/:id/reembolso` |
| **Saliente** | Notificaciones | `notif_conf` / `notif_canc` / `notif_reprog` | `NotificacionesClient` → `POST /api/notificaciones` |
| **Entrante** | Agenda, Historia Clínica, Métricas | turnos por profesional/paciente/estado/rango | endpoints que Turnos expone |

---

## 1. Principios de arquitectura

### TUR-001 — Sin acoplamiento en proceso
Turnos no importa `PagosService` ni `NotificacionesService` ni ningún otro service/entidad de feature. **Todo por costura REST.** (Reemplaza el `TODO (Pareja C)` del stub que dice "invocar PagosService/NotificacionesService por inyección — nunca HTTP interno".) No exporta su service.

### TUR-002 — Costuras REST con degradación elegante
- Sin `AgendaClient` → en `lenient` se acepta el `fecha+hora` pedido sin validar RN09 (`WARN`, marca `disponibilidadNoValidada`); en `strict` → `424`.
- Sin `PagosClient` → el turno queda en `SOLICITADO` con `pagoPendiente: true`; se puede reintentar el pago después.
- Sin `NotificacionesClient` → log local, `notificacionPendiente: true`.
- Sin `PacientesClient` en `strict` → `424` (no se puede garantizar RN06).
Flags `TURNOS_VALIDAR_AGENDA` y `TURNOS_VALIDAR_PACIENTES` (`lenient`|`strict`).

### TUR-003 — Contratos compartidos
`Turno`, `TurnoResumen`, `SolicitarTurnoRequest`, `PagarTurnoRequest`, `ReprogramarTurnoRequest`, `LiquidacionPago`, `EstadoTurno` (enum, ya existe) en `packages/shared-types` con fixture.

### TUR-004 — Readiness observable
`GET /api/turnos/_estado` → `{ modulo:'turnos', dependencias:{ pacientes, servicios, profesionales, agenda, pagos, notificaciones }, modo }`.

### TUR-005 — Orquestación explícita
Turnos es el orquestador de CUU02/03/04: coordina las costuras en un orden documentado y compensa ante fallo parcial (TUR-018). Ningún otro módulo orquesta este flujo.

---

## 2. Modelo de datos y máquina de estados

### TUR-006 — Entidad `Turno`
`turnos`: `id` (uuid), `pacienteId`, `profesionalId`, `servicioId`, `fecha` (date), `hora` (`HH:mm`), `estado` (`EstadoTurno`), `monto` (numeric(12,2)), `pagoId` (uuid nullable), `comprobanteNumero` (string nullable), `reservaExpiraEn` (timestamp nullable), `creadoPor` (`sub`), `origen` (`PACIENTE` | `ASISTENTE`), `motivoCancelacion` (nullable), timestamps. Índices por `(profesionalId, fecha)`, `(pacienteId, fecha)`, `estado`.

### TUR-007 — Enum `EstadoTurno` (ya existe en shared-types) — consolidar valores
`SOLICITADO` (reserva temporal, con `reservaExpiraEn`) → `CONFIRMADO` (pago ok, RN16) | `NO_CONFIRMADO` (pago rechazado / no confirma, RN20) ; `CONFIRMADO` → `REPROGRAMADO` (mantiene id, nueva fecha/hora) | `CANCELADO` | `ASISTIDO`. Documentar transiciones válidas y rechazar el resto con `409`.

### TUR-008 — Reserva temporal
Al `SOLICITADO` se setea `reservaExpiraEn = now + N min` (`TURNOS_RESERVA_MIN`, default 15). Un job / verificación perezosa marca `NO_CONFIRMADO` los `SOLICITADO` vencidos y libera el slot (CUU02 `4.a`).

### TUR-009 — Registrar entidad
`TypeOrmModule.forFeature([Turno])` + `Turno` en `data-source.ts`.

### TUR-010 — Unicidad de slot (RN09, defensa en profundidad)
Índice único parcial `(profesionalId, fecha, hora)` sobre estados que ocupan (`SOLICITADO`, `CONFIRMADO`, `REPROGRAMADO`) para evitar doble reserva ante carrera, además de la validación por Agenda.

---

## 3. Contratos compartidos (`packages/shared-types`)

### TUR-011 — DTOs
- `Turno`: todos los campos de TUR-006 + `pacienteNombre`, `profesionalNombre`, `servicioNombre` (best-effort).
- `TurnoResumen`: `idTurno`, `fecha`, `hora`, `estado` (para `turnos_vigentes`).
- `SolicitarTurnoRequest`: `servicioId`, `profesionalId`, `fecha`, `hora`, `pacienteId?` (obligatorio si lo pide el ASISTENTE; si lo pide el PACIENTE se toma del `sub`).
- `LiquidacionPago`: `pacienteId`, `servicioId`, `profesionalId`, `fecha`, `hora`, `monto` (respuesta del paso 4).
- `PagarTurnoRequest`: `metodoPago` (`MetodoPago`), `idTransaccion`.
- `ReprogramarTurnoRequest`: `fecha`, `hora`.

### TUR-012 — Exportar
`export type { ... }` en `src/index.ts` + `turnoFixture`, `liquidacionPagoFixture`.

---

## 4. API — endpoints que Turnos expone

### TUR-013 — `POST /api/turnos` — solicitar (CUU02 pasos 3–4)
Valida: paciente registrado (`PacientesClient`, RN06); servicio activo y profesional lo brinda (`ServiciosClient`); profesional existe (`ProfesionalesClient`); `fecha` en día laborable no feriado (RN07/RN08); slot disponible (`AgendaClient`, RN09). Crea `Turno` en `SOLICITADO` con `reservaExpiraEn`; calcula `monto` = precio del servicio. Devuelve `201` con `Turno` + `LiquidacionPago`.
`3.a` sin disponibilidad → `409` "No hay horarios disponibles para el servicio o profesional seleccionado en esta fecha."
**RBAC:** `@Roles(Rol.PACIENTE, Rol.ASISTENTE)`. PACIENTE: `pacienteId` = su perfil. ASISTENTE: `pacienteId` obligatorio (buscador CUU02 alt 1.a).

### TUR-014 — `POST /api/turnos/:id/pago` — pagar y confirmar (CUU02 paso 5)
`PagarTurnoRequest`. Invoca `PagosClient.procesar(turnoId, metodo, monto, idTransaccion)`:
- aprobado → `estado = CONFIRMADO`, guarda `pagoId` + `comprobanteNumero`, invoca `NotificacionesClient` (`notif_conf`), la agenda queda ocupada (RN16, RN17). `200` con `Turno` confirmado.
- rechazado → `estado = NO_CONFIRMADO`, libera slot (RN20). `402`/`200` con estado y mensaje "La transacción de pago fue rechazada. El turno no pudo ser confirmado."
**RBAC:** `PACIENTE` dueño del turno o `ASISTENTE`.

### TUR-015 — `GET /api/turnos` — listados (costura entrante + `turnos_vigentes`)
Query `?pacienteId=&profesionalId=&estado=&desde=&hasta=`. Devuelve `Turno[]` / `TurnoResumen[]`. Lo consumen Agenda, Historia Clínica y Métricas.
**RBAC:** `PACIENTE` sólo los propios (fuerza `pacienteId = sub`); `PROFESIONAL` sólo los propios (`profesionalId = sub`); `ASISTENTE`/`DUENO` cualquiera.

### TUR-016 — `GET /api/turnos/:id` — detalle
`Turno` completo. `404` si no existe; `403` si no es propio (para PACIENTE/PROFESIONAL).

### TUR-017 — `POST /api/turnos/:id/cancelar` — CUU03
Valida plazo: si `origen`/quien cancela es `PACIENTE` y faltan < 24 h (RN12, RN22) → `409` "No es posible cancelar..."; `ASISTENTE` sin restricción (RN13). Setea `CANCELADO` + `motivoCancelacion`, invoca `PagosClient` para ajustar el estado del pago a reembolso pendiente (RN21, RN23), `NotificacionesClient` (`notif_canc` a PAC y ADM), libera agenda (RN18). `200`.
**RBAC:** `PACIENTE` dueño (con regla 24 h) o `ASISTENTE`.

### TUR-018 — `POST /api/turnos/:id/reprogramar` — CUU04
Sólo `CONFIRMADO`/`REPROGRAMADO`. Mismo servicio y profesional. Valida plazo (RN12/RN13 igual que cancelar) y disponibilidad del nuevo slot (`AgendaClient`). Actualiza `fecha`/`hora`, `estado = REPROGRAMADO`, `NotificacionesClient` (`notif_reprog`), actualiza agenda (RN18). Si no hay alternativas (`2.a`) → `409` "No hay horarios disponibles. ¿Desea cancelar el turno?" (el cliente decide invocar TUR-017).
**RBAC:** `PACIENTE` dueño (con regla 24 h) o `ASISTENTE`.

### TUR-019 — `POST /api/turnos/:id/asistencia` — marcar asistido
`estado = ASISTIDO`. Insumo de Historia Clínica (precondición) y Métricas.
**RBAC:** `@Roles(Rol.PROFESIONAL, Rol.ASISTENTE)`.

### TUR-020 — `GET /api/turnos/mis-turnos` — atajo del paciente
`turnos_vigentes` del `sub` (estados no terminales), ordenados por fecha.

### TUR-021 — Reubicar el ping
`GET /api/turnos` pasa a ser el listado (TUR-015); el `estado()` va a `GET /api/turnos/_estado` (TUR-004).

---

## 5. Costuras salientes

### TUR-022 — `PacientesClient`
`estaRegistrado(pacienteId): Promise<boolean>` → `GET /api/pacientes/:id/registrado`; `buscar(criterio)` → `GET /api/pacientes?buscar=`; `porUsuario(sub)` → `GET /api/pacientes/por-usuario/:usuarioId`. Degradación: TUR-002.

### TUR-023 — `ServiciosClient`
`obtener(servicioId): Promise<{ nombre; duracionMin; precio; activo }>` → `GET /api/servicios/:id`; `profesionalesDe(servicioId)` → `GET /api/servicios/:id/profesionales`. Degradación: en `lenient` usa `monto` provisto o `0` + `WARN`.

### TUR-024 — `ProfesionalesClient`
`existe(id)` / `resumen(ids)` → `GET /api/profesionales/:id`, `?ids=`. Degradación: best-effort.

### TUR-025 — `AgendaClient`
`disponibilidad(profesionalId, servicioId, fecha): Promise<SlotDisponible[]>` → `GET /api/agenda/:profId/disponibilidad`. Degradación: TUR-002 (`disponibilidadNoValidada`).

### TUR-026 — `PagosClient`
`procesar(turnoId, metodo, monto, idTransaccion): Promise<{ estado: EstadoPago; pagoId; comprobanteNumero? }>` → `POST /api/pagos`; `ajustarReembolso(pagoId): Promise<void>` → `POST /api/pagos/:id/reembolso`. Degradación: turno en `SOLICITADO` con `pagoPendiente`.

### TUR-027 — `NotificacionesClient`
`enviar(email, mensaje)` → `POST /api/notificaciones`. Plantillas: `notif_conf` ("Turno confirmado. Detalles:" + prof + serv + fecha + hora + pac), `notif_canc` ("Turno cancelado. Detalles."), `notif_reprog` ("Turno Reprogramado. Detalles:"). Degradación: log local.

---

## 6. Reglas de negocio

### TUR-028 — RN06 — paciente registrado
`POST /api/turnos` exige `estaRegistrado = true`. En `strict`, costura caída → `424`.

### TUR-029 — RN03 / RN07 / RN08 / RN09 / RN19
El turno referencia servicio + profesional + fecha + hora; la fecha debe ser L–V no feriada; el slot debe estar libre (validado por Agenda); sin disponibilidad ⇒ mensaje del `3.a`.

### TUR-030 — RN12 / RN13 / RN22 — plazo de 24 h
Para acciones del `PACIENTE`: `fechaHoraTurno - now >= 24 h` exactas; si no, bloquear cancelar/reprogramar con el mensaje taxativo. Para `ASISTENTE`: sin restricción.

### TUR-031 — RN16 / RN20 — efecto del pago
Pago aprobado ⇒ `CONFIRMADO` + comprobante + `notif_conf`. Pago rechazado ⇒ `NO_CONFIRMADO` + liberar slot.

### TUR-032 — RN17 / RN18 — efecto en agenda
La agenda se deriva de los estados de Turnos (Agenda recalcula). Turnos no escribe en Agenda; sólo cambia su propio `estado`, que Agenda lee.

### TUR-033 — RN21 / RN23 — reembolso
Cancelación con > 24 h ⇒ `ajustarReembolso` deja el pago en estado "reembolso pendiente"; la devolución del dinero la hace la asistente manualmente (fuera del sistema).

### TUR-034 — Compensación ante fallo parcial
Si el pago se aprueba pero falla la persistencia del `CONFIRMADO`, reintentar/registrar inconsistencia para conciliación manual (log `ERROR` + endpoint `_estado` marca `conciliacionPendiente`). No dejar cobrado sin turno ni turno confirmado sin cobro.

---

## 7. Seguridad y control de acceso

### TUR-035 — RBAC por endpoint
Solicitar/pagar: `PACIENTE` (propios) + `ASISTENTE`. Cancelar/reprogramar: `PACIENTE` dueño (regla 24 h) + `ASISTENTE`. Asistencia: `PROFESIONAL` + `ASISTENTE`. Listados: filtrado por rol (TUR-015). `_estado`: sin rol.

---

## 8. Consumidores de Turnos

### TUR-036 — Vía REST
Agenda (`GET /api/turnos?profesionalId=&rango=`), Historia Clínica (`?pacienteId=&profesionalId=&estado=ASISTIDO`), Métricas de negocio y de desempeño (`?rango=&estado=`). Cada uno con su `TurnosClient`.

---

## 9. Frontend

### TUR-037 — Flujo "Solicitud y Agenda de Turno"
Selección escalonada servicio → profesional → (consume Agenda) día/hora → confirmar → recibe `LiquidacionPago`.

### TUR-038 — "Pasarela de Pago del Servicio"
Muestra monto y método; `POST /api/turnos/:id/pago`. Éxito → "Confirmación y Comprobante"; rechazo → "Transacción Rechazada" con "Reintentar" / "Salir".

### TUR-039 — "Panel de Control / Gestionar Agenda" y "Mis Turnos"
Lista de turnos vigentes con acciones Cancelar / Reprogramar; ventana emergente de confirmación crítica; alerta taxativa cuando el PACIENTE está fuera del plazo de 24 h.

### TUR-040 — Métodos de API
`lib/api.ts`: `turnos.solicitar`, `turnos.pagar`, `turnos.listar`, `turnos.obtener`, `turnos.cancelar`, `turnos.reprogramar`, `turnos.marcarAsistencia`, `turnos.misTurnos`.

---

## 10. Datos de prueba y configuración

### TUR-041 — Seed
Algunos turnos demo para el paciente y profesional demo en distintos estados (`CONFIRMADO` futuro, `ASISTIDO` pasado, `CANCELADO`). Idempotente.

### TUR-042 — Variables de entorno
`PACIENTES_API_URL`, `SERVICIOS_API_URL`, `PROFESIONALES_API_URL`, `AGENDA_API_URL`, `PAGOS_API_URL`, `NOTIFICACIONES_API_URL`, `TURNOS_VALIDAR_AGENDA`, `TURNOS_VALIDAR_PACIENTES` (`lenient`|`strict`), `TURNOS_RESERVA_MIN` (default 15). Documentar en `README.md` y `.env`.

---

## 11. Pruebas

### TUR-043 — Unit — máquina de estados
Transiciones válidas/ inválidas; reserva temporal vence a `NO_CONFIRMADO`; monto = precio del servicio.

### TUR-044 — Unit — reglas de plazo (RN12/RN13/RN22)
PACIENTE a 23:59 h → bloqueado; a 24:01 h → permitido; ASISTENTE siempre permitido.

### TUR-045 — Costuras
Cada `*Client` con HTTP mockeado (OK / `404` / timeout). Escenario "Pagos caído" → turno `SOLICITADO` + `pagoPendiente`. Escenario "Agenda caída" en `lenient` → turno creado con `disponibilidadNoValidada`.

### TUR-046 — Controller / RBAC
PACIENTE no puede listar turnos ajenos; no puede pagar un turno que no es suyo; PROFESIONAL sólo ve los suyos.

### TUR-047 — e2e CUU02 / CUU03 / CUU04
Reserva → pago aprobado → confirmado + comprobante + `notif_conf` en bitácora. Reserva → pago rechazado → `NO_CONFIRMADO` + slot liberado. Cancelación con > 24 h → `CANCELADO` + reembolso pendiente + `notif_canc`. Reprogramación a slot libre → `REPROGRAMADO` + `notif_reprog`.

---

## 12. No funcionales y documentación

### TUR-048 — Mensajes del diccionario
"Turno confirmado. Detalles:", "La transacción de pago fue rechazada. El turno no pudo ser confirmado.", "No hay horarios disponibles...", "No es posible cancelar...", "Turno Reprogramado. Detalles:".

### TUR-049 — Idempotencia del pago
`POST /api/turnos/:id/pago` con `idTransaccion` repetido no cobra dos veces (clave de idempotencia).

### TUR-050 — Documentación
`README.md` del backend con `/api/turnos` y el diagrama de orquestación (6 costuras); `ART ME` (máquina de estados) enlazado; JSDoc referenciando CUU02–04 y RN03/RN06/RN09/RN12/RN13/RN16–RN23.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| TUR-001…TUR-005, TUR-021, TUR-022…TUR-027, TUR-036 | `docs/_comun-arquitectura.md` |
| TUR-006, TUR-011 | `turno = id_prof + id_serv + id_pac + fecha + hora + estado_t + comp_pago + monto` |
| TUR-013, TUR-037 | CUU02 camino básico + alt 1.a / 3.a / 4.a; `liquidacion_pago`, `servicios_disponibles` |
| TUR-014, TUR-031, TUR-038 | CUU02 paso 5; RN11, RN16, RN20; `datos_pago = tipo_medio_pago + id_transaccion` |
| TUR-017, TUR-030, TUR-033 | CUU03; RN12, RN13, RN21, RN22, RN23 |
| TUR-018 | CUU04; alt 2.a (ofrecer cancelar) |
| TUR-019 | precondición de CUU09 (turno asistido) y métricas |
| TUR-028, TUR-029 | RN06, RN03, RN07, RN08, RN09, RN19 |
| TUR-032 | RN17, RN18 |
| TUR-007, TUR-010, TUR-043 | ART ME (máquina de estados del turno) |
