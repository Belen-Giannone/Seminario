# Módulo Métricas de Desempeño — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU08 — Visualizar métricas de desempeño.
**Pareja responsable:** Pareja E (Métricas).
**Estado actual:** esqueleto (`metricas-desempeno.module.ts`, `metricas-desempeno.controller.ts` con `GET /metricas-desempeno` de ping, `metricas-desempeno.service.ts` con `estado()`). Sin lógica de agregación, DTOs, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- Actor primario: **Profesional Médico (MED)**. RN15: un profesional **sólo puede visualizar las estadísticas de su propio desempeño individual**.
- Camino básico: login → panel con Módulo de Rendimiento Profesional → elegir "métricas de desempeño" e ingresar **período** (`criterio_periodo_med = fecha_inicio + fecha_fin`) → el sistema procesa el historial clínico del profesional y muestra sus indicadores individuales → fin.
- Alternativo `4.a`: sin registros de atención en el período → "No se encontraron registros de turnos atendidos para su perfil en el rango de fechas seleccionado." → pedir nuevo rango.
- Indicadores (diccionario `tablero_desempeño`):
  - `1{fecha + cant_turnos_dia}n` — turnos atendidos por día.
  - `1{nro_semana + cant_turnos_sem}n` — turnos atendidos por semana.
  - `cant_pacientes_mes` — pacientes distintos atendidos en el último mes.
  - `1{id_serv + cant_turnos_serv}n` — turnos agrupados por servicio realizado.
  - `horas_trabajadas_mes` — total de horas trabajadas en el último mes.
- Postcondición: el sistema garantiza la **confidencialidad frente a otros profesionales**.
- Sin entidad propia: agrega datos de Turnos (`ASISTIDO` del profesional) + Servicios (nombres, duración).
- Pantalla: "Panel de Control del Profesional Médico" → acceso "Consultar métricas".

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Turnos | turnos `ASISTIDO` del profesional autenticado en el rango | `TurnosClient` → `GET /api/turnos?profesionalId=<sub>&estado=ASISTIDO&desde=&hasta=` |
| **Saliente** | Servicios | nombre y duración de cada servicio | `ServiciosClient` → `GET /api/servicios?soloActivos=false` |
| **Saliente** | Profesionales | resolver `sub` → `profesionalId` (si Turnos indexa por `profesionalId` y no por `usuarioId`) | `ProfesionalesClient` → `GET /api/profesionales/por-usuario/:usuarioId` |
| **Entrante** | — | ninguna. Hoja del grafo (sólo la consume el frontend). | — |

---

## 1. Principios de arquitectura

### MDE-001 — Sin acoplamiento en proceso
No importa `TurnosService` / `ServiciosService`. (Reemplaza el `TODO (Pareja E)` del stub.) Todo por clientes HTTP de sólo lectura. No exporta su service.

### MDE-002 — Costuras REST con degradación elegante
Cálculo por bloque independiente; costura caída → ese bloque vuelve `{ disponible: false, motivo }` y el resto se sirve (`200`). Flag `METRICAS_DESEMPENO_MODO=lenient|strict`.

### MDE-003 — Contratos compartidos
`TableroDesempeno`, `MetricaDia`, `MetricaSemana`, `MetricaServicioRealizado`, `PeriodoMedQuery` en `packages/shared-types` con fixture.

### MDE-004 — Readiness observable
`GET /api/metricas-desempeno/_estado` → `{ modulo:'metricas-desempeno', dependencias:{ turnos, servicios, profesionales }, modo }`.

### MDE-005 — Sin entidad propia
No crea tablas. Caché por `(profesionalId, rango)` con TTL configurable.

---

## 2. Lógica de agregación

### MDE-006 — Identidad desde el token (RN15)
El `profesionalId` **siempre** se deriva del `sub` del JWT (vía `ProfesionalesClient.porUsuario(sub)` o directamente si Turnos acepta `usuarioId`). El endpoint **no acepta** `profesionalId` por query/param. Cualquier intento de pasar otro id se ignora.

### MDE-007 — Turnos por día y por semana
`1{fecha + cant_turnos_dia}n` y `1{nro_semana + cant_turnos_sem}n`: agrupar los turnos `ASISTIDO` del profesional en el rango por fecha y por número de semana ISO.

### MDE-008 — Pacientes del mes
`cant_pacientes_mes` = cantidad de `pacienteId` **distintos** en turnos `ASISTIDO` del último mes.

### MDE-009 — Turnos por servicio realizado
`1{id_serv + cant_turnos_serv}n`: contar turnos `ASISTIDO` por `servicioId`; resolver `nom_serv` con `ServiciosClient`.

### MDE-010 — Horas trabajadas del mes
`horas_trabajadas_mes` = Σ (`duracionMin` del servicio de cada turno `ASISTIDO` del último mes) / 60. Usar la **misma definición** que MNE-010 para que ambos tableros coincidan.

### MDE-011 — Período vacío (`4.a`)
Sin turnos `ASISTIDO` del profesional en el rango → `200` con `{ vacio: true, mensaje: "No se encontraron registros de turnos atendidos para su perfil en el rango de fechas seleccionado." }`.

---

## 3. Contratos compartidos (`packages/shared-types`)

### MDE-012 — DTOs
- `PeriodoMedQuery`: `{ fechaInicio: string; fechaFin: string }` (sin `profesionalId` — RN15).
- `TableroDesempeno`: `{ rango; porDia: MetricaDia[]; porSemana: MetricaSemana[]; pacientesMes: number; porServicio: MetricaServicioRealizado[]; horasMes: number; bloquesNoDisponibles: string[]; vacio?: boolean; mensaje?: string }`.
- `MetricaDia` `{ fecha; cantTurnos }`, `MetricaSemana` `{ nroSemana; cantTurnos }`, `MetricaServicioRealizado` `{ idServ; nombre; cantTurnos }`.

### MDE-013 — Exportar
`export type { ... }` en `src/index.ts` + `tableroDesempenoFixture`.

---

## 4. API — endpoints que Métricas de Desempeño expone

### MDE-014 — `GET /api/metricas-desempeno` — tablero individual
Query `PeriodoMedQuery`. Devuelve `TableroDesempeno` del **profesional autenticado**.
**RBAC:** `@Roles(Rol.PROFESIONAL)` + `JwtAuthGuard` (RN15). Otros roles → `403`.
`4.a` → `200` con `vacio: true` (MDE-011).

### MDE-015 — Sub-recursos (opcional, mismo RBAC e identidad por token)
`GET /api/metricas-desempeno/por-dia`, `/por-semana`, `/pacientes-mes`, `/por-servicio`, `/horas-mes`.

### MDE-016 — Reubicar el ping
`GET /api/metricas-desempeno` pasa a ser el tablero (MDE-014); el `estado()` va a `GET /api/metricas-desempeno/_estado` (MDE-004).

---

## 5. Costuras salientes

### MDE-017 — `TurnosClient`
`asistidosDe(profesionalId|usuarioId, desde, hasta): Promise<Turno[]>` → `GET /api/turnos?profesionalId=&estado=ASISTIDO&desde=&hasta=`. Timeout ~3 s. Degradación: bloque no disponible (MDE-002).

### MDE-018 — `ServiciosClient`
`catalogo(): Promise<{ id; nombre; duracionMin }[]>` → `GET /api/servicios?soloActivos=false`. Cacheado; degradación: nombres `null`, duración = bloque por defecto para el cálculo de horas + `WARN`.

### MDE-019 — `ProfesionalesClient`
`porUsuario(sub): Promise<{ id }>` → `GET /api/profesionales/por-usuario/:usuarioId`. Sólo si Turnos indexa por `profesionalId`. Degradación: si Turnos acepta `usuarioId`, se omite esta costura.

---

## 6. Reglas de negocio y seguridad

### MDE-020 — RN15 — sólo el propio desempeño
Identidad por token (MDE-006). El servicio **nunca** consulta turnos de otro profesional. Test dedicado: un profesional A no puede ver métricas de B ni pasando parámetros.

### MDE-021 — Confidencialidad frente a otros profesionales
No cachear ni loguear datos de un profesional de forma accesible a otro; la clave de caché incluye el `profesionalId` y el resultado no se expone sin re-validar el token.

### MDE-022 — Sólo lectura
No escribe en ningún módulo; no expone mutaciones.

### MDE-023 — Rango válido
`fechaInicio <= fechaFin`; máximo configurable → `400` si se excede.

---

## 7. Frontend

### MDE-024 — "Panel de Control del Profesional Médico" → Consultar métricas
Dashboard individual: turnos por día (línea/barras), por semana, KPI de pacientes del mes, barras de turnos por servicio, KPI de horas del mes. Selector de rango. Estado "sin datos" para `4.a`. Bloques no disponibles como placeholder.
> Para los gráficos, seguir la skill `dataviz`.

### MDE-025 — Acceso restringido en la navegación
La entrada "Mis métricas" sólo aparece para `PROFESIONAL`; ruta protegida en el frontend además del backend.

### MDE-026 — Métodos de API
`lib/api.ts`: `metricasDesempeno.tablero(periodo)` y sub-recursos si se usan. Nunca envía `profesionalId`.

---

## 8. Configuración

### MDE-027 — Variables de entorno
`TURNOS_API_URL`, `SERVICIOS_API_URL`, `PROFESIONALES_API_URL`, `METRICAS_DESEMPENO_MODO` (`lenient`|`strict`), `METRICAS_DESEMPENO_CACHE_TTL_S` (default 300), `METRICAS_DESEMPENO_RANGO_MAX_MESES` (default 24). Documentar en `README.md` y `.env`.

---

## 9. Pruebas

### MDE-028 — Unit de agregación
Con turnos sintéticos `ASISTIDO`: agrupación por día y por semana ISO; pacientes distintos del mes; turnos por servicio; horas = Σ duración / 60; período vacío → `vacio: true`.

### MDE-029 — Costuras
`TurnosClient` / `ServiciosClient` / `ProfesionalesClient` con HTTP mockeado (OK / `404` / timeout). "Servicios caído" → tablero `200` con `porServicio` en `bloquesNoDisponibles` y horas aproximadas.

### MDE-030 — Controller / RBAC (RN15)
`ASISTENTE`, `DUENO`, `PACIENTE` → `403`. Profesional A con `?profesionalId=B` → responde con datos de **A** (parámetro ignorado), nunca de B.

### MDE-031 — e2e CUU08
Con turnos asistidos demo del profesional: consulta un rango con datos y ve todos los indicadores; consulta un rango sin datos y ve el mensaje del `4.a`.

---

## 10. No funcionales y documentación

### MDE-032 — Rendimiento
Tablero < 700 ms con caché caliente; una sola llamada a Turnos por rango; catálogo de servicios cacheado.

### MDE-033 — Mensajes
"No se encontraron registros de turnos atendidos para su perfil en el rango de fechas seleccionado."

### MDE-034 — Documentación
`README.md` del backend con `/api/metricas-desempeno`; JSDoc referenciando CUU08 y RN15; aclarar que la identidad viene del token y que las fórmulas de "horas" y conteos coinciden con Métricas de Negocio (MNE).

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| MDE-001…MDE-005, MDE-016, MDE-017, MDE-018, MDE-019 | `docs/_comun-arquitectura.md` |
| MDE-006, MDE-020, MDE-021, MDE-030 | RN15 (sólo el propio desempeño) + postcondición de confidencialidad |
| MDE-007 | `1{fecha + cant_turnos_dia}n` + `1{nro_semana + cant_turnos_sem}n` |
| MDE-008 | `cant_pacientes_mes` |
| MDE-009 | `1{id_serv + cant_turnos_serv}n` |
| MDE-010, MDE-034 | `horas_trabajadas_mes` (misma definición que MNE-010) |
| MDE-011, MDE-033 | CUU08 alt 4.a (sin registros de atención) |
| MDE-014, MDE-025 | CUU08 camino básico; "Panel de Control del Profesional Médico" |
