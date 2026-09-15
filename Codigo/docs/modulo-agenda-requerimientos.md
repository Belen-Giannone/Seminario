# Módulo Agenda — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU05 — Consultar agenda. Además provee la **disponibilidad de horarios** que consumen CUU02 (solicitar turno) y CUU04 (reprogramar).
**Pareja responsable:** Pareja C (Agenda & Turnos) — lado lectura.
**Estado actual:** implementado — backend (`GET /api/agenda/_estado`, `/mi-agenda`, `/:profesionalId`, `/:profesionalId/disponibilidad`, clientes REST con degradación AGE-016…019, cálculo de rejilla en `agenda-calculo.util.ts`, tests AGE-029/030/031) y frontend del panel "Gestionar Agenda" (AGE-026/027: `AgendaPage.tsx`, `api.agenda.*`). Pendiente: AGE-025 (selector de disponibilidad en la pantalla de solicitud de turno, parte del flujo de Turnos) y AGE-032 (e2e real, requiere que Profesionales/Turnos/Servicios existan). **Sin entidad propia**: la agenda es una vista derivada de Profesionales (horarios) + Turnos (ocupación) + feriados.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- Actor primario: Profesional médico (PROF). Otros: Asistente (ADM).
- Camino básico: (1) PROF/ADM solicita ver su agenda → el sistema muestra los turnos asignados con **fecha, hora, paciente y servicio**; (2) permite filtrar por período (día, semana, mes).
- Alternativos: `1.a` PROF sin turnos → "no existen turnos en la agenda"; `1.b` ADM consulta un profesional inexistente → "el profesional no está registrado".
- Diccionario: `agenda_prof = id_prof + 0{id_pac + id_serv + fecha + hora}n`; `horarios_serv = 0{fecha + hora}n` (slots libres para un servicio/profesional).
- RN07: sólo lunes a viernes. RN08: no en feriados / días no laborables. RN09: un turno sólo se reserva si el horario está libre. RN19: sin horarios ⇒ el turno no puede concretarse. RN17/RN18: la agenda se actualiza al confirmar/cancelar/reprogramar (efecto en Turnos; Agenda simplemente lo refleja al recalcular).
- Pantalla "Panel de Control / Gestionar Agenda": columnas Fecha, Hora, Paciente, Servicio, sección "Turnos Pendientes". Restringe automáticamente fines de semana y feriados.

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Profesionales | franjas de atención por día; existencia del profesional | `ProfesionalesClient` → `GET /api/profesionales/:id/horarios`, `GET /api/profesionales/:id` |
| **Saliente** | Turnos | turnos ocupados / vigentes en un rango | `TurnosClient` → `GET /api/turnos?profesionalId=&desde=&hasta=` |
| **Saliente** | Servicios | duración del servicio (tamaño de bloque para calcular slots) | `ServiciosClient` → `GET /api/servicios/:id` |
| **Saliente** | Feriados | días no laborables nacionales (RN08) | `FeriadosClient` → API pública o dataset local |
| **Entrante** | Turnos, Frontend | agenda de un profesional; disponibilidad para un servicio/fecha | endpoints que Agenda expone |

---

## 1. Principios de arquitectura

### AGE-001 — Sin acoplamiento en proceso
Agenda no importa `ProfesionalesService` ni `TurnosService`; todo por clientes HTTP. No exporta su service. (Reemplaza el `TODO (Pareja C)` del stub que dice "inyectar ProfesionalesService + TurnosService".)

### AGE-002 — Costuras REST con degradación elegante
Si falta una dependencia:
- sin `ProfesionalesClient` → no hay horarios base ⇒ disponibilidad vacía + `WARN` (equivale a RN19).
- sin `TurnosClient` → se asume 0 ocupación y se marca la respuesta `ocupacionParcial: true` + `WARN`.
- sin `FeriadosClient` → se usa la lista estática local de feriados.
Flag `AGENDA_MODO=lenient|strict` (en `strict`, faltar Profesionales o Turnos devuelve `424`).

### AGE-003 — Contratos compartidos
`AgendaProfesional`, `SlotDisponible`, `ConsultarAgendaQuery`, `DisponibilidadQuery` en `packages/shared-types` con fixture.

### AGE-004 — Readiness observable
`GET /api/agenda/_estado` → `{ modulo:'agenda', dependencias:{ profesionales, turnos, servicios, feriados }, modo }`.

### AGE-005 — Sin entidad propia
Agenda no crea tablas. Toda su salida se recalcula on-demand a partir de las costuras (+ caché corta opcional, AGE-019).

---

## 2. Lógica de cálculo

### AGE-006 — Rejilla de slots
Para un profesional y rango: expandir sus `HorarioAtencion` (franjas L–V) en slots del tamaño del **bloque de agenda** (constante compartida, `SER-026`), excluir sábados/domingos (RN07) y feriados (RN08).

### AGE-007 — Descontar ocupación (RN09)
Restar de la rejilla los turnos en estados que ocupan horario (`SOLICITADO` con reserva temporal, `CONFIRMADO`, `REPROGRAMADO`), obtenidos por `TurnosClient`. Los `CANCELADO` / `NO_CONFIRMADO` liberan el slot (RN18).

### AGE-008 — Bloques por duración de servicio
Para `disponibilidad?servicioId=`, agrupar slots contiguos suficientes para cubrir `duracionMin` del servicio (`ServiciosClient`); sólo ofrecer inicios de bloque que quepan enteros antes del fin de la franja.

### AGE-009 — Reserva temporal (coordinación con Turnos)
Documentar que la "reserva temporal" de CUU02 paso 4 la mantiene **Turnos** (estado `SOLICITADO` con `expiraEn`); Agenda la ve como ocupada hasta que expira o se confirma. Agenda no gestiona locks.

---

## 3. Contratos compartidos (`packages/shared-types`)

### AGE-010 — DTOs
- `AgendaItem`: `idTurno`, `fecha`, `hora`, `pacienteNombre`, `servicioNombre`, `estado`.
- `AgendaProfesional`: `idProf`, `profesionalNombre`, `periodo`, `items: AgendaItem[]`, `ocupacionParcial?`.
- `SlotDisponible`: `fecha`, `hora`.
- `ConsultarAgendaQuery`: `{ profesionalId; desde; hasta; periodo?: 'dia'|'semana'|'mes' }`.
- `DisponibilidadQuery`: `{ profesionalId; servicioId; desde; hasta }`.

### AGE-011 — Exportar
`export type { ... }` en `src/index.ts` + `agendaProfesionalFixture`.

---

## 4. API — endpoints que Agenda expone

### AGE-012 — `GET /api/agenda/:profesionalId` — agenda de turnos (CUU05)
Query `?desde=&hasta=&periodo=dia|semana|mes`. Devuelve `AgendaProfesional` con `AgendaItem[]` (fecha, hora, paciente, servicio, estado). Nombres de paciente/servicio enriquecidos best-effort.
`1.a` sin turnos → `200` con `items: []` y mensaje "No existen turnos en la agenda."
`1.b` profesional inexistente (según `ProfesionalesClient`) → `404` "El profesional no está registrado."
**RBAC:** `@Roles(Rol.PROFESIONAL, Rol.ASISTENTE)`. Un `PROFESIONAL` sólo su propia agenda: se ignora `:profesionalId` y se usa el `sub` (o se valida que coincida). `ASISTENTE` cualquiera.

### AGE-013 — `GET /api/agenda/:profesionalId/disponibilidad` — slots libres
Query `?servicioId=&desde=&hasta=`. Devuelve `SlotDisponible[]` (`horarios_serv = 0{fecha + hora}n`) ya descontando ocupación, fines de semana y feriados, en bloques por duración del servicio.
Lista vacía = sin disponibilidad (RN19) — no es error.
**RBAC:** autenticado (lo consume el flujo de solicitud/reprogramación de turno, tanto PACIENTE como ASISTENTE).

### AGE-014 — `GET /api/agenda/mi-agenda` — atajo del profesional
Equivalente a AGE-012 con `profesionalId = sub`. Para la pantalla del panel médico.

### AGE-015 — Reubicar el ping
`GET /api/agenda` deja de ser `estado()`; mover a `GET /api/agenda/_estado` (AGE-004).

---

## 5. Costuras salientes

### AGE-016 — `ProfesionalesClient`
`horariosDe(profesionalId): Promise<HorarioAtencion[]>` → `GET /api/profesionales/:id/horarios`; `existe(profesionalId): Promise<boolean>` → `GET /api/profesionales/:id`. Base URL `PROFESIONALES_API_URL`. Degradación: AGE-002.

### AGE-017 — `TurnosClient`
`ocupacion(profesionalId, desde, hasta): Promise<AgendaItem[]>` → `GET /api/turnos?profesionalId=&desde=&hasta=`. Degradación: AGE-002 (`ocupacionParcial: true`).

### AGE-018 — `ServiciosClient`
`obtener(servicioId): Promise<{ duracionMin }>` → `GET /api/servicios/:id`. Degradación: usar el bloque de agenda por defecto + `WARN`.

### AGE-019 — `FeriadosClient` + caché
Feriados nacionales (RN08): API pública (p. ej. calendario nacional) **o** dataset JSON local versionado. Fallback siempre al dataset local. Caché en memoria de la rejilla calculada por `(profesionalId, rango)` con TTL corto (p. ej. 60 s) para no golpear las 3 costuras en cada request de la pantalla.

---

## 6. Reglas de negocio

### AGE-020 — Días laborables (RN07) y feriados (RN08)
Nunca ofrecer ni listar slots en sábado, domingo o feriado. La pantalla los muestra deshabilitados.

### AGE-021 — Horario libre (RN09) y sin disponibilidad (RN19)
Un slot ofrecido debe estar 100% libre. Si tras descontar todo no queda nada, la respuesta es lista vacía; el consumidor (Turnos/Frontend) interpreta RN19.

### AGE-022 — Consistencia con Turnos
Agenda es de **sólo lectura**; no crea, mueve ni cancela turnos. Cualquier cambio de disponibilidad proviene de operaciones en Turnos (RN17/RN18) y se refleja al recalcular / expirar la caché.

---

## 7. Consumidores

### AGE-023 — Turnos
Antes de reservar (CUU02 paso 3–4) y de reprogramar (CUU04 paso 2), Turnos llama a `GET /api/agenda/:profesionalId/disponibilidad` para validar RN09. Con su propio `AgendaClient` y degradación.

### AGE-024 — Frontend
Pantalla "Solicitud y Agenda de Turno" (selector de días/horas) y "Panel de Control / Gestionar Agenda" (grilla).

---

## 8. Frontend

### AGE-025 — Visualización de disponibilidad en solicitud de turno
Tras elegir servicio + profesional, consumir AGE-013 y pintar el calendario con fines de semana/feriados deshabilitados.

### AGE-026 — Panel "Gestionar Agenda"
Grilla con columnas Fecha, Hora, Paciente, Servicio; filtro por período (día/semana/mes); sección "Turnos Pendientes". Para `PROFESIONAL` usa AGE-014; para `ASISTENTE`, selector de profesional + AGE-012.

### AGE-027 — Métodos de API
`lib/api.ts`: `agenda.deProfesional`, `agenda.disponibilidad`, `agenda.miAgenda`.

---

## 9. Configuración

### AGE-028 — Variables de entorno
`PROFESIONALES_API_URL`, `TURNOS_API_URL`, `SERVICIOS_API_URL`, `FERIADOS_API_URL` (opcional), `AGENDA_MODO` (`lenient`|`strict`), `AGENDA_CACHE_TTL_S` (default 60). El bloque de agenda vive en shared-types (`SER-026`). Dataset local de feriados en `src/modules/agenda/feriados.<anio>.json`.

---

## 10. Pruebas

### AGE-029 — Unit del cálculo
Rejilla L–V correcta; sábado/domingo/feriado excluidos; ocupación descontada; bloques por duración de servicio; sin franjas ⇒ disponibilidad vacía.

### AGE-030 — Costuras
`ProfesionalesClient` / `TurnosClient` / `ServiciosClient` / `FeriadosClient` con HTTP mockeado (OK / `404` / timeout → fallback y flags `ocupacionParcial` / dataset local).

### AGE-031 — Controller / RBAC
`PROFESIONAL` sólo ve su agenda; `ASISTENTE` cualquiera; `1.b` profesional inexistente → `404`.

### AGE-032 — e2e CUU05
Con turnos demo cargados: consultar agenda por día/semana/mes; verificar columnas y "Turnos Pendientes".

---

## 11. No funcionales y documentación

### AGE-033 — Rendimiento
Respuesta < 400 ms con caché caliente; la pantalla de solicitud no debe disparar más de 1 request por cambio de criterio.

### AGE-034 — Mensajes
"No existen turnos en la agenda." (`1.a`), "El profesional no está registrado." (`1.b`).

### AGE-035 — Documentación
`README.md` del backend con `/api/agenda`; JSDoc referenciando CUU05 y RN07/RN08/RN09/RN19; diagrama de las 4 costuras; nota de que el módulo no persiste nada.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| AGE-001…AGE-005, AGE-015, AGE-016…AGE-019 | `docs/_comun-arquitectura.md` |
| AGE-006, AGE-020 | RN07 (lunes a viernes) |
| AGE-019, AGE-020 | RN08 (feriados / no laborables) |
| AGE-007, AGE-021 | RN09 (horario libre) |
| AGE-002, AGE-021 | RN19 (sin horarios ⇒ turno no concretable) |
| AGE-012, AGE-026, AGE-034 | CUU05 camino básico + alt 1.a / 1.b; `agenda_prof = id_prof + 0{id_pac + id_serv + fecha + hora}n` |
| AGE-008, AGE-013 | `horarios_serv = 0{fecha + hora}n` (slots para un servicio) |
| AGE-022, AGE-023 | RN17, RN18 (la agenda se actualiza por operaciones de Turnos) |
