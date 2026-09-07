# Módulo Pagos & Comprobantes — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU06 — Generar comprobante de turno. Además provee el **procesamiento de pago** del paso 5 de CUU02 y el **ajuste de reembolso** de CUU03/CUU04.
**Pareja responsable:** Pareja D (Pagos & Notificaciones).
**Estado actual:** esqueleto (`pagos.module.ts`, `pagos.controller.ts` con `GET /pagos` de ping, `pagos.service.ts` con `estado()`). Sin entidad, DTOs, persistencia, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- CUU06: se dispara cuando el sistema recibe la confirmación de un turno pagado. Camino básico: (1) el sistema genera el comprobante; (2) lo envía a PAC y a ADM. Sin alternativos.
- Precondición de sistema: el sistema recibió el pago después de la solicitud del turno.
- RN11: medios de pago autorizados = tarjeta de crédito/débito, transferencia bancaria, billetera virtual.
- RN16: pago exitoso ⇒ el sistema confirma el turno, emite comprobante y notifica. RN20: pago rechazado ⇒ turno "no confirmado".
- RN21: cancelación/reprogramación con > 24 h ⇒ actualizar estado del pago. RN23: el reembolso ajusta el estado del pago original **para que la asistente efectúe la devolución del dinero** (la devolución física es manual).
- Diccionario: `datos_pago = tipo_medio_pago + id_transaccion`; `liquidacion_pago = id_pac + id_serv + id_prof + fecha + hora + monto`; `comp_turno = turno + monto`; `comp_pago` es el identificador del comprobante dentro de `turno`.
- Enums ya en shared-types: `EstadoPago`, `MetodoPago`.
- Pantallas: "Pasarela de Pago del Servicio" (monto + botón PAGAR), "Confirmación y Comprobante de Turno", "Transacción Rechazada (Error de Pago)" (Reintentar / Salir).

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Turnos | datos del turno para el comprobante (`nom_prof`, `nom_serv`, `fecha`, `hora`, `nom_pac`, `monto`) | `TurnosClient` → `GET /api/turnos/:id` |
| **Saliente** | Notificaciones | envío del comprobante a PAC y ADM (CUU06 paso 2) | `NotificacionesClient` → `POST /api/notificaciones` |
| **Saliente** | Pasarela de pago | autorización de la transacción (simulada en el TP) | `PasarelaClient` (mock) |
| **Entrante** | Turnos | `procesar(...)`, `ajustarReembolso(...)`, estado del pago | endpoints que Pagos expone |
| **Entrante** | Métricas de negocio | ingresos del período | `GET /api/pagos?desde=&hasta=` |

---

## 1. Principios de arquitectura

### PAG-001 — Sin acoplamiento en proceso
Pagos no importa `TurnosService` ni `NotificacionesService`; costura REST. No exporta su service. (Reemplaza el `TODO (Pareja D)` del stub que dice "exponer `procesar(...)` para que Turnos lo invoque".)

### PAG-002 — Costuras REST con degradación elegante
- Sin `TurnosClient` → el comprobante se emite con los datos mínimos recibidos en el request + `WARN` (`datosTurnoParciales: true`).
- Sin `NotificacionesClient` → el comprobante se genera y persiste igual; el envío queda `PENDIENTE` + `WARN`.
- La `PasarelaClient` mock siempre está disponible.
Flag `PAGOS_VALIDAR_TURNOS=lenient|strict`.

### PAG-003 — Contratos compartidos
`Pago`, `Comprobante`, `ProcesarPagoRequest`, `AjustarReembolsoRequest`, `EstadoPago` / `MetodoPago` (enums, ya existen) en `packages/shared-types` con fixture.

### PAG-004 — Readiness observable
`GET /api/pagos/_estado` → `{ modulo:'pagos', dependencias:{ turnos, notificaciones, pasarela }, modo, modoPasarela }`.

---

## 2. Modelo de datos y persistencia

### PAG-005 — Entidad `Pago`
`pagos`: `id` (uuid), `turnoId` (uuid, único por pago vigente), `monto` (numeric(12,2)), `metodo` (`MetodoPago`), `estado` (`EstadoPago`), `idTransaccion` (string, del `datos_pago`), `idTransaccionPasarela` (string, respuesta de la pasarela), `procesadoEn` (timestamp), `reembolsoEstado` (`NO_APLICA` | `PENDIENTE` | `EFECTUADO`), `reembolsoRegistradoPor` (nullable), timestamps.

### PAG-006 — Enum `EstadoPago` (ya existe) — consolidar valores
`PENDIENTE` → `APROBADO` | `RECHAZADO` ; `APROBADO` → `REEMBOLSO_PENDIENTE` → `REEMBOLSADO`. Documentar transiciones; rechazar el resto con `409`.

### PAG-007 — Entidad `Comprobante`
`comprobantes`: `id` (uuid), `numero` (string único, correlativo p. ej. `COMP-000123`), `pagoId` (uuid), `turnoId` (uuid), `monto`, `emitidoEn` (timestamp), `contenido` (jsonb: `nom_pac`, `nom_prof`, `nom_serv`, `fecha`, `hora`, `monto`, `metodo`), `envioEstado` (`PENDIENTE` | `ENVIADO`).

### PAG-008 — Registrar entidades
`TypeOrmModule.forFeature([Pago, Comprobante])` + ambas en `data-source.ts`.

### PAG-009 — Idempotencia
`(turnoId, idTransaccion)` único: reprocesar la misma transacción devuelve el pago existente sin volver a cobrar (coordina con `TUR-049`).

---

## 3. Contratos compartidos (`packages/shared-types`)

### PAG-010 — DTOs
- `Pago`: campos de PAG-005 (sin datos internos de pasarela para roles no ADM).
- `Comprobante`: `numero`, `turnoId`, `monto`, `emitidoEn`, `contenido`.
- `ProcesarPagoRequest`: `turnoId`, `metodoPago` (`MetodoPago`), `idTransaccion`, `monto`, y opcionalmente `datosTurno` (`nombrePaciente`, `nombreProfesional`, `nombreServicio`, `fecha`, `hora`) para el fallback de PAG-002.
- `AjustarReembolsoRequest`: `{ motivo?: string }`.

### PAG-011 — Exportar
`export type { ... }` en `src/index.ts` + `pagoFixture`, `comprobanteFixture`.

---

## 4. API — endpoints que Pagos expone

### PAG-012 — `POST /api/pagos` — procesar pago (paso 5 de CUU02)
`ProcesarPagoRequest`. Valida `metodoPago` ∈ RN11 (PAG-018). Llama a `PasarelaClient.autorizar(monto, metodo, idTransaccion)`:
- autorizado → `Pago` `APROBADO`; genera `Comprobante` (PAG-014); invoca `NotificacionesClient`; devuelve `201` `{ estado: APROBADO, pagoId, comprobanteNumero }`.
- rechazado → `Pago` `RECHAZADO`; devuelve `200`/`402` `{ estado: RECHAZADO, motivo }`.
**RBAC:** `@Roles(Rol.PACIENTE, Rol.ASISTENTE)`. (Invocado por Turnos vía `PagosClient`, o directamente desde la pasarela del frontend.)

### PAG-013 — `GET /api/pagos` — listado (costura entrante de Métricas)
Query `?turnoId=&estado=&desde=&hasta=`. Devuelve `Pago[]` (montos e ingresos). 
**RBAC:** `ASISTENTE`, `DUENO`; el `PACIENTE` sólo por `turnoId` propio.

### PAG-014 — `GET /api/pagos/:id/comprobante` — CUU06
Devuelve el `Comprobante` (`comp_turno = turno + monto`). Si aún no existe y el pago está `APROBADO`, lo genera on-demand.
**RBAC:** `PACIENTE` dueño del turno, `ASISTENTE`, `DUENO`.

### PAG-015 — `GET /api/pagos/:id` — detalle
`Pago`. `404` si no existe. Datos de pasarela sólo para `ASISTENTE`/`DUENO`.

### PAG-016 — `POST /api/pagos/:id/reembolso` — ajustar reembolso (CUU03/CUU04, RN21/RN23)
Marca `estado = REEMBOLSO_PENDIENTE`, `reembolsoEstado = PENDIENTE`. **No** mueve dinero. `200`.
**RBAC:** `@Roles(Rol.ASISTENTE)` (o invocado por Turnos vía costura).

### PAG-017 — `POST /api/pagos/:id/reembolso/confirmar` — devolución efectuada
La asistente registra que hizo la devolución manual: `reembolsoEstado = EFECTUADO`, `estado = REEMBOLSADO`, `reembolsoRegistradoPor = sub`.
**RBAC:** `@Roles(Rol.ASISTENTE)`.

### PAG-018 — Reubicar el ping
`GET /api/pagos` pasa a ser el listado (PAG-013); el `estado()` va a `GET /api/pagos/_estado` (PAG-004).

---

## 5. Costuras salientes

### PAG-019 — `TurnosClient`
`obtener(turnoId): Promise<{ pacienteNombre; profesionalNombre; servicioNombre; fecha; hora; monto }>` → `GET /api/turnos/:id`. Degradación: usar `datosTurno` del request + `WARN` (`datosTurnoParciales`).

### PAG-020 — `NotificacionesClient`
`enviar(email, mensaje)` → `POST /api/notificaciones`. Envía el comprobante a PAC y a ADM (CUU06 paso 2). Degradación: `envioEstado = PENDIENTE` + log local.

### PAG-021 — `PasarelaClient` (mock)
`autorizar(monto, metodo, idTransaccion): Promise<{ autorizado: boolean; idTransaccionPasarela?; motivo? }>`. Implementación mock configurable por `PAGOS_MODO_PASARELA` y `PAGOS_TASA_APROBACION` (para pruebas: p. ej. rechazar montos terminados en `.13`, o tasa aleatoria). Interfaz lista para enchufar una pasarela real después sin tocar el resto.

---

## 6. Reglas de negocio

### PAG-022 — RN11 — medios de pago
`metodoPago` sólo `TARJETA_CREDITO`, `TARJETA_DEBITO`, `TRANSFERENCIA`, `BILLETERA_VIRTUAL` (según `MetodoPago`). Otro valor → `400`.

### PAG-023 — RN16 / RN20 — resultado del pago
El endpoint devuelve `EstadoPago` claro; **Turnos** es quien confirma o no el turno según ese estado (Pagos no toca el turno).

### PAG-024 — RN21 / RN23 — reembolso en dos pasos
`ajustarReembolso` (automático, disparado por la cancelación) deja `REEMBOLSO_PENDIENTE`; `reembolso/confirmar` (manual, la asistente) lo cierra. El sistema nunca transfiere dinero de vuelta.

### PAG-025 — Monto = liquidación del turno
El `monto` procesado debe coincidir con el `monto` del turno / precio del servicio; discrepancia → `409` "El monto no coincide con la liquidación del turno."

### PAG-026 — Comprobante inmutable
Una vez emitido, el `Comprobante` no se modifica; una anulación es un registro nuevo vinculado.

---

## 7. Seguridad y control de acceso

### PAG-027 — RBAC por endpoint
Procesar pago: `PACIENTE` + `ASISTENTE`. Listado / detalle con datos de pasarela: `ASISTENTE` + `DUENO` (RN14 aplica al agregado financiero). Comprobante: dueño del turno + ADM. Reembolso: `ASISTENTE`. `_estado`: sin rol.

---

## 8. Consumidores de Pagos

### PAG-028 — Vía REST
Turnos (`POST /api/pagos`, `POST /api/pagos/:id/reembolso`), Métricas de negocio (`GET /api/pagos?desde=&hasta=` para `ingresos_mes`). Cada uno con su `PagosClient`.

---

## 9. Frontend

### PAG-029 — "Pasarela de Pago del Servicio"
Muestra el `monto` de la `LiquidacionPago`, selector de método (RN11), botón "PAGAR" → `POST /api/pagos` (o vía `POST /api/turnos/:id/pago`).

### PAG-030 — "Confirmación y Comprobante de Turno"
Al aprobarse: muestra el comprobante (`GET /api/pagos/:id/comprobante`), estado "Confirmado", botón "SALIR".

### PAG-031 — "Transacción Rechazada"
Mensaje "Pago rechazado", botones "Reintentar" (reintenta con nuevo `idTransaccion`) y "Salir".

### PAG-032 — Gestión de reembolsos (perfil ASISTENTE)
Lista de pagos en `REEMBOLSO_PENDIENTE` con acción "Marcar devolución efectuada" (`PAG-017`).

### PAG-033 — Métodos de API
`lib/api.ts`: `pagos.procesar`, `pagos.listar`, `pagos.obtener`, `pagos.comprobante`, `pagos.ajustarReembolso`, `pagos.confirmarReembolso`.

---

## 10. Datos de prueba y configuración

### PAG-034 — Seed
Pagos demo para los turnos demo (`APROBADO` con comprobante para el turno confirmado; `REEMBOLSO_PENDIENTE` para el cancelado). Idempotente por `(turnoId, idTransaccion)`.

### PAG-035 — Variables de entorno
`TURNOS_API_URL`, `NOTIFICACIONES_API_URL`, `PAGOS_VALIDAR_TURNOS` (`lenient`|`strict`), `PAGOS_MODO_PASARELA` (`mock`), `PAGOS_TASA_APROBACION` (default `1.0`). Documentar en `README.md` y `.env`.

---

## 11. Pruebas

### PAG-036 — Unit `PagosService`
Método inválido → `400`; monto ≠ liquidación → `409`; aprobado genera comprobante y notifica; rechazado no genera comprobante; reembolso en dos pasos; idempotencia por `idTransaccion`.

### PAG-037 — Costuras
`TurnosClient` / `NotificacionesClient` con HTTP mockeado (OK / `404` / timeout → fallback). `PasarelaClient` mock con tasa de aprobación forzada.

### PAG-038 — Controller / RBAC
PACIENTE no ve el listado financiero global (`403`); sí su comprobante. Sólo ASISTENTE confirma reembolsos.

### PAG-039 — e2e CUU06 / pago
Pago aprobado → comprobante emitido → notificación a PAC y ADM en la bitácora. Pago rechazado → sin comprobante, mensaje del `5.a`. Cancelación → `REEMBOLSO_PENDIENTE` → asistente confirma → `REEMBOLSADO`.

---

## 12. No funcionales y documentación

### PAG-040 — Mensajes del diccionario
"Turno confirmado. Detalles:", "La transacción de pago fue rechazada. El turno no pudo ser confirmado."

### PAG-041 — Seguridad de datos de pago
No persistir datos sensibles de tarjeta (sólo `metodo` + `idTransaccion` + respuesta de pasarela). No loguear `idTransaccion` completo.

### PAG-042 — Documentación
`README.md` del backend con `/api/pagos`; JSDoc referenciando CUU06 y RN11/RN16/RN20/RN21/RN23; nota de que la pasarela es mock y de que el reembolso físico es manual.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| PAG-001…PAG-004, PAG-018, PAG-019, PAG-020, PAG-028 | `docs/_comun-arquitectura.md` |
| PAG-005, PAG-010, PAG-022 | `datos_pago = tipo_medio_pago + id_transaccion`; RN11 |
| PAG-007, PAG-014, PAG-030 | CUU06; `comp_turno = turno + monto` |
| PAG-012, PAG-023, PAG-029, PAG-031 | CUU02 paso 5; RN16, RN20 |
| PAG-016, PAG-017, PAG-024, PAG-032 | CUU03; RN21, RN23 |
| PAG-013, PAG-028 | costura entrante de Métricas de negocio (`ingresos_mes`) |
| PAG-009, PAG-049(→TUR-049) | idempotencia del cobro |
