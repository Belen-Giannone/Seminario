# Módulo Métricas de Negocio — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU07 — Visualizar métricas del negocio.
**Pareja responsable:** Pareja E (Métricas).
**Estado actual:** esqueleto (`metricas-negocio.module.ts`, `metricas-negocio.controller.ts` con `GET /metricas-negocio` de ping, `metricas-negocio.service.ts` con `estado()`). Sin lógica de agregación, DTOs, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- Actor primario: **Dueño (DUE)**. RN14: el acceso a reportes financieros y métricas globales de ingresos está **restringido únicamente al dueño**.
- Camino básico: login → panel con Módulo de Estadísticas → elegir "métricas globales" e ingresar **período** (`criterio_periodo = fecha_inicio + fecha_fin`) → el sistema procesa el histórico y muestra indicadores consolidados → fin.
- Alternativo `4.a`: sin registros operativos en el período → "No se encontraron registros de turnos o pagos en el rango de fechas seleccionado." → pedir nuevo rango.
- Indicadores (diccionario `tablero_metricas`):
  - `ingresos_mes` — ingresos del último mes (de Pagos aprobados).
  - `1{periodo + cant_turnos}n` — cantidad de turnos por período.
  - `tasa_solicitados` / `tasa_confirmados` / `tasa_asistidos` — tasas de conversión del embudo de turnos.
  - `1{id_prof + cant_turnos_p + horas_trabajadas}n` — turnos y horas por profesional en el último mes.
  - `1{id_serv + cant_turnos_s}n` — cantidad de turnos por servicio.
  - `datos_mercado` / `dat_mercado_comp` — comparación con datos de mercado.
- Sin entidad propia: **agrega** datos de Turnos + Pagos + Servicios + Profesionales + una fuente de mercado.
- Pantalla: "Panel de Control" del Dueño (dashboard con indicadores y gráficos).

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Turnos | turnos por estado y rango (conteos, tasas, por servicio, por profesional) | `TurnosClient` → `GET /api/turnos?desde=&hasta=&estado=` |
| **Saliente** | Pagos | ingresos del período (pagos aprobados) | `PagosClient` → `GET /api/pagos?desde=&hasta=&estado=APROBADO` |
| **Saliente** | Servicios | nombres de servicios | `ServiciosClient` → `GET /api/servicios?soloActivos=false` |
| **Saliente** | Profesionales | nombres; horarios para estimar horas | `ProfesionalesClient` → `GET /api/profesionales?ids=`, `/:id/horarios` |
| **Saliente** | Mercado | `datos_mercado` para comparación | `MercadoClient` → API externa o dataset local |
| **Entrante** | — | ninguna. Es hoja del grafo (sólo lo consume el frontend). | — |

---

## 1. Principios de arquitectura

### MNE-001 — Sin acoplamiento en proceso
No importa `TurnosService` / `PagosService` / etc. (Reemplaza el `TODO (Pareja E)` del stub que dice "agrega datos ... por inyección de sus servicios".) Todo por clientes HTTP de sólo lectura. No exporta su service.

### MNE-002 — Costuras REST con degradación elegante
Cada indicador se calcula de forma independiente: si una costura no responde, ese bloque del tablero vuelve como `{ disponible: false, motivo }` y el resto se sirve igual (`200`). `WARN` por bloque faltante. Flag `METRICAS_MODO=lenient|strict` (en `strict`, faltar Turnos o Pagos → `424`).

### MNE-003 — Contratos compartidos
`TableroNegocio`, `MetricaPeriodo`, `MetricaServicio`, `MetricaProfesional`, `TasasConversion`, `DatosMercado`, `PeriodoQuery` en `packages/shared-types` con fixture.

### MNE-004 — Readiness observable
`GET /api/metricas-negocio/_estado` → `{ modulo:'metricas-negocio', dependencias:{ turnos, pagos, servicios, profesionales, mercado }, modo }`.

### MNE-005 — Sin entidad propia
No crea tablas. Caché de resultados por `(rango, granularidad)` con TTL configurable (MNE-018).

---

## 2. Lógica de agregación

### MNE-006 — `ingresos_mes` / ingresos del período
Σ `monto` de pagos `APROBADO` con `procesadoEn` en el rango (`PagosClient`). Descontar reembolsos efectuados (`REEMBOLSADO`).

### MNE-007 — Turnos por período
`1{periodo + cant_turnos}n`: agrupar turnos por día/semana/mes (parámetro `granularidad`) dentro del rango.

### MNE-008 — Tasas de conversión
`tasa_solicitados` = solicitados / solicitados (=1, o total base), `tasa_confirmados` = confirmados / solicitados, `tasa_asistidos` = asistidos / confirmados. Estados desde `TurnosClient` (contar por `estado` incluyendo los que pasaron por cada estado — si no hay histórico de transiciones, aproximar con el estado final y documentarlo).

### MNE-009 — Turnos por servicio
`1{id_serv + cant_turnos_s}n`: contar turnos por `servicioId` en el rango; resolver `nom_serv` con `ServiciosClient`.

### MNE-010 — Turnos y horas por profesional
`1{id_prof + cant_turnos_p + horas_trabajadas}n`: contar turnos `ASISTIDO` por `profesionalId`; `horas_trabajadas` = Σ (`duracionMin` del servicio de cada turno asistido) / 60 en el último mes. `nom_prof` con `ProfesionalesClient`.

### MNE-011 — Datos de mercado
`datos_mercado`: obtener de `MercadoClient` (API externa configurable) o del dataset local `src/modules/metricas-negocio/mercado.json` (fallback siempre). Comparar los indicadores propios contra el benchmark.

### MNE-012 — Período vacío (`4.a`)
Si no hay turnos **ni** pagos en el rango → responder `200` con `{ vacio: true, mensaje: "No se encontraron registros de turnos o pagos en el rango de fechas seleccionado." }`.

---

## 3. Contratos compartidos (`packages/shared-types`)

### MNE-013 — DTOs
- `PeriodoQuery`: `{ fechaInicio: string; fechaFin: string; granularidad?: 'dia'|'semana'|'mes' }`.
- `TableroNegocio`: `{ rango; ingresos: number; turnosPorPeriodo: MetricaPeriodo[]; tasas: TasasConversion; porProfesional: MetricaProfesional[]; porServicio: MetricaServicio[]; mercado: DatosMercado | null; bloquesNoDisponibles: string[]; vacio?: boolean; mensaje?: string }`.
- `MetricaPeriodo` `{ periodo; cantTurnos }`, `MetricaServicio` `{ idServ; nombre; cantTurnos }`, `MetricaProfesional` `{ idProf; nombre; cantTurnos; horasTrabajadas }`, `TasasConversion` `{ solicitados; confirmados; asistidos; tasaConfirmados; tasaAsistidos }`.

### MNE-014 — Exportar
`export type { ... }` en `src/index.ts` + `tableroNegocioFixture`.

---

## 4. API — endpoints que Métricas de Negocio expone

### MNE-015 — `GET /api/metricas-negocio` — tablero consolidado
Query `PeriodoQuery`. Devuelve `TableroNegocio` (todos los bloques; los que fallaron listados en `bloquesNoDisponibles`).
**RBAC:** `@Roles(Rol.DUENO)` + `JwtAuthGuard` (RN14). Cualquier otro rol → `403`.
`4.a` → `200` con `vacio: true` (MNE-012).

### MNE-016 — Sub-recursos (opcional, mismos filtros y RBAC)
`GET /api/metricas-negocio/ingresos`, `/turnos-por-servicio`, `/turnos-por-profesional`, `/tasas-conversion`, `/horas-por-profesional`, `/mercado`. Útiles para cargar el dashboard por partes.

### MNE-017 — Reubicar el ping
`GET /api/metricas-negocio` pasa a ser el tablero (MNE-015); el `estado()` va a `GET /api/metricas-negocio/_estado` (MNE-004).

---

## 5. Costuras salientes

### MNE-018 — `TurnosClient` / `PagosClient` / `ServiciosClient` / `ProfesionalesClient`
Todas de sólo lectura, con base URL por env, timeout ~3 s, y degradación por bloque (MNE-002). Caché en memoria por `(endpoint, rango)` con TTL `METRICAS_CACHE_TTL_S` (default 300).

### MNE-019 — `MercadoClient`
`benchmark(rango): Promise<DatosMercado>` → API externa (`METRICAS_MERCADO_URL`) o dataset local. Fallback siempre al dataset local versionado.

---

## 6. Reglas de negocio y seguridad

### MNE-020 — RN14 — exclusivo del Dueño
Todos los endpoints `@Roles(Rol.DUENO)`. No hay variante para ASISTENTE ni PROFESIONAL. Documentar explícitamente.

### MNE-021 — Sólo lectura
El módulo nunca escribe en Turnos/Pagos/Servicios/Profesionales. No expone endpoints de mutación.

### MNE-022 — Rango válido
`fechaInicio <= fechaFin`; rango máximo configurable (p. ej. 24 meses) → `400` si se excede.

### MNE-023 — Consistencia de conteos
Documentar la definición exacta de cada tasa y de "horas trabajadas" para que coincida con lo que reporta Métricas de Desempeño (MDE) sobre los mismos turnos.

---

## 7. Frontend

### MNE-024 — "Panel de Control" del Dueño
Dashboard con: KPI de ingresos del mes, gráfico de turnos por período, embudo de conversión, barras de turnos por servicio y por profesional, tabla de horas por profesional, comparación con mercado. Selector de rango de fechas. Estado "sin datos" para `4.a`. Bloques no disponibles se muestran como placeholder, no rompen el tablero.
> Para los gráficos, seguir la skill `dataviz` antes de elegir colores/tipos.

### MNE-025 — Acceso restringido en la navegación
La entrada "Métricas del negocio" sólo aparece para `DUENO`; ruta protegida en el frontend además del backend.

### MNE-026 — Métodos de API
`lib/api.ts`: `metricasNegocio.tablero(periodo)` y, si se usan, los sub-recursos.

---

## 8. Configuración

### MNE-027 — Variables de entorno
`TURNOS_API_URL`, `PAGOS_API_URL`, `SERVICIOS_API_URL`, `PROFESIONALES_API_URL`, `METRICAS_MERCADO_URL` (opcional), `METRICAS_MODO` (`lenient`|`strict`), `METRICAS_CACHE_TTL_S` (default 300), `METRICAS_RANGO_MAX_MESES` (default 24). Dataset local `mercado.json`. Documentar en `README.md` y `.env`.

---

## 9. Pruebas

### MNE-028 — Unit de agregación
Con datasets sintéticos de turnos/pagos: ingresos = Σ aprobados − reembolsados; tasas correctas; agrupación por día/semana/mes; horas por profesional; período vacío → `vacio: true`.

### MNE-029 — Costuras
Cada `*Client` con HTTP mockeado (OK / `404` / timeout). Escenario "Pagos caído" → tablero `200` con `ingresos` en `bloquesNoDisponibles`.

### MNE-030 — Controller / RBAC (RN14)
`ASISTENTE`, `PROFESIONAL`, `PACIENTE` → `403` en todos los endpoints; `DUENO` → `200`.

### MNE-031 — e2e CUU07
Con turnos y pagos demo: el dueño consulta un rango con datos y ve todos los indicadores; consulta un rango sin datos y ve el mensaje del `4.a`.

---

## 10. No funcionales y documentación

### MNE-032 — Rendimiento
Tablero < 800 ms con caché caliente; sin caché, ≤ 1 request por costura (no N+1 por servicio/profesional: pedir en lote con `?ids=`).

### MNE-033 — Mensajes
"No se encontraron registros de turnos o pagos en el rango de fechas seleccionado."

### MNE-034 — Documentación
`README.md` del backend con `/api/metricas-negocio`; JSDoc referenciando CUU07 y RN14; definición de cada métrica y su fórmula; nota de que el módulo es sólo lectura y hoja del grafo.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| MNE-001…MNE-005, MNE-017, MNE-018, MNE-019 | `docs/_comun-arquitectura.md` |
| MNE-006 | `ingresos_mes` (Pagos aprobados) |
| MNE-007 | `1{periodo + cant_turnos}n` |
| MNE-008, MNE-023 | `tasa_solicitados + tasa_confirmados + tasa_asistidos` |
| MNE-009 | `1{id_serv + cant_turnos_s}n` |
| MNE-010 | `1{id_prof + cant_turnos_p + horas_trabajadas}n` |
| MNE-011, MNE-019 | `datos_mercado` / `dat_mercado_comp` |
| MNE-012, MNE-033 | CUU07 alt 4.a (sin registros en el período) |
| MNE-015, MNE-020, MNE-030 | RN14 (exclusivo del Dueño) |
