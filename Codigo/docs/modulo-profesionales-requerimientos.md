# Módulo Profesionales — Requerimientos para el desarrollo completo

**Cubre:** alta y mantenimiento de profesionales médicos y de sus **horarios de atención**. Sin CUU propio, pero es insumo obligatorio de Servicios (CUU10), Agenda (CUU05), Turnos (CUU02–04) y Métricas (CUU07–08).
**Pareja responsable:** Pareja B (Servicios & Profesionales).
**Estado actual:** esqueleto (`profesionales.module.ts`, `profesionales.controller.ts` con `GET /profesionales` de ping, `profesionales.service.ts` con `estado()`). Sin entidad, DTOs, persistencia, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- RN01: rol `PROFESIONAL`. El centro tiene "uno o más profesionales médicos".
- RN07: los turnos sólo se programan de lunes a viernes → los horarios de atención se definen sólo para días laborables.
- CUU05 alt 1.b: "ADM consulta agenda de un profesional inexistente → el sistema informa que el profesional no está registrado" ⇒ el módulo debe poder responder "existe / no existe".
- CUU10 diccionario: `serv = ... + 1{id_prof}n` ⇒ un servicio referencia profesionales por id; Servicios valida esos ids contra este módulo (ver `SER-021`).
- CUU08 diccionario: `met_prof = 0{turno}n + nom_prof + nom_serv`; CUU07: "cantidad de turnos por profesional", "horas trabajadas por cada profesional en el último mes".
- Pantalla "Panel de Control del Profesional Médico": identificador del especialista (datos prof), accesos a métricas, agenda e historia clínica.

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Auth | crear/obtener el `Usuario` (rol PROFESIONAL, nombre, email) | `AuthClient` → `POST /api/usuarios`, `GET /api/usuarios?ids=` |
| **Entrante** | Servicios | validar `id_prof`, resumen (`ProfesionalResumen`) | `GET /api/profesionales?ids=` |
| **Entrante** | Agenda | franjas de atención por día | `GET /api/profesionales/:id/horarios` |
| **Entrante** | Turnos, Métricas | existencia, nombre, especialidad | `GET /api/profesionales/:id` |

---

## 1. Principios de arquitectura

### PRO-001 — Sin acoplamiento en proceso
No importa services/entidades de otros feature modules; usa `AuthClient` (HTTP). No exporta su service para inyección cruzada.

### PRO-002 — Costuras REST con degradación elegante
Si Auth no responde al alta, se persiste el `Profesional` con `usuarioId = null` / `PENDIENTE_CREDENCIALES` + `WARN`; los endpoints de lectura de horarios y existencia siguen operativos. Flag `PROFESIONALES_VALIDAR_AUTH=lenient|strict`.

### PRO-003 — Contratos compartidos
`Profesional`, `ProfesionalResumen`, `HorarioAtencion`, `CrearProfesionalRequest`, `ActualizarProfesionalRequest`, `DefinirHorariosRequest` en `packages/shared-types` con fixture. **`ProfesionalResumen` es el contrato que espera `SER-021`** — mantenerlos idénticos.

### PRO-004 — Readiness observable
`GET /api/profesionales/_estado` → `{ modulo:'profesionales', dependencias:{ auth }, modoValidacion }`.

### PRO-005 — Actualizar el JSDoc del stub
Reemplazar el `TODO (Pareja B)` ("exponer método público ... para que Agenda calcule disponibilidad sin tocar esta entidad") por la costura REST `GET /api/profesionales/:id/horarios`.

---

## 2. Modelo de datos y persistencia

### PRO-006 — Entidad `Profesional`
`profesionales`: `id` (uuid), `usuarioId` (uuid, FK lógica a `usuarios`, nullable mientras PRO-002), `especialidad` (string), `matricula` (string, única), `activo` (boolean, default `true`), timestamps. Nombre/email/dni viven en `Usuario` (Auth), se resuelven por `AuthClient`.

### PRO-007 — Entidad `HorarioAtencion`
`horarios_atencion`: `id` (uuid), `profesionalId` (uuid, FK a `profesionales`), `diaSemana` (int 1–5, **sólo lunes a viernes**, RN07), `horaInicio` (`HH:mm`), `horaFin` (`HH:mm`). Varias franjas por día permitidas (mañana/tarde). Índice por `profesionalId`.

### PRO-008 — Registrar entidades
`TypeOrmModule.forFeature([Profesional, HorarioAtencion])` en el módulo + ambas en `data-source.ts`.

### PRO-009 — Baja lógica
`activo = false`; no se borra (turnos históricos y servicios lo referencian).

---

## 3. Contratos compartidos (`packages/shared-types`)

### PRO-010 — DTOs
- `ProfesionalResumen`: `id`, `nombreCompleto`, `especialidad`, `activo` (**contrato de `SER-011`/`SER-021`**).
- `Profesional`: `ProfesionalResumen` + `usuarioId`, `matricula`, `email`, `horarios: HorarioAtencion[]`.
- `HorarioAtencion`: `diaSemana` (1–5), `horaInicio`, `horaFin`.
- `CrearProfesionalRequest`: `nombre`, `apellido`, `email`, `dni?`, `especialidad`, `matricula`, `horarios?`.
- `ActualizarProfesionalRequest`: `Partial` de `especialidad`, `matricula`, `activo`.
- `DefinirHorariosRequest`: `{ horarios: HorarioAtencion[] }` (reemplaza el set completo).

### PRO-011 — Exportar
`export type { ... }` en `src/index.ts` + `profesionalResumenFixture`.

---

## 4. API — endpoints que Profesionales expone

### PRO-012 — `POST /api/profesionales` — alta
Invoca `AuthClient.crearUsuario({...datos, rol: PROFESIONAL})`; crea `Profesional` (+ horarios si vienen). `201` con `Profesional` + credencial inicial (una vez).
**RBAC:** `@Roles(Rol.ASISTENTE, Rol.DUENO)`.

### PRO-013 — `GET /api/profesionales` — listado / resumen por ids
`?ids=a,b,c` (costura de Servicios), `?activos=true`, sin filtro = listado. Devuelve `ProfesionalResumen[]` (nombres enriquecidos best-effort vía `AuthClient`).
**RBAC:** autenticado.

### PRO-014 — `GET /api/profesionales/:id` — detalle
`Profesional` completo con horarios. `404` "El profesional no está registrado." (CUU05 alt 1.b).

### PRO-015 — `GET /api/profesionales/:id/horarios` — franjas de atención
`HorarioAtencion[]` del profesional. Es la costura entrante de **Agenda** (AGE-*). Si el profesional no existe → `404`.
**RBAC:** autenticado.

### PRO-016 — `PUT /api/profesionales/:id/horarios` — definir horarios
Reemplaza el set completo (`DefinirHorariosRequest`). Valida RN07 (PRO-020) y no solapamiento (PRO-021).
**RBAC:** `@Roles(Rol.ASISTENTE, Rol.DUENO)` y el propio profesional (`sub` == `usuarioId`).

### PRO-017 — `PATCH /api/profesionales/:id` — edición y baja lógica
`especialidad`, `matricula`, `activo`. **RBAC:** `@Roles(Rol.ASISTENTE, Rol.DUENO)`.

### PRO-018 — `GET /api/profesionales/por-usuario/:usuarioId`
Resolución `sub` → `profesionalId` para Agenda/Métricas/Historia Clínica.

### PRO-019 — Reubicar el ping
`GET /api/profesionales` deja de ser el `estado()`; mover a `GET /api/profesionales/_estado` (PRO-004).

---

## 5. Costuras salientes

### PRO-020 — `AuthClient`
`crearUsuario(req)` → `POST /api/usuarios`; `obtenerUsuarios(ids)` → `GET /api/usuarios?ids=`; `actualizarContacto(id, datos)`. Base URL `AUTH_API_URL`. Degradación: PRO-002; lecturas devuelven `nombreCompleto: null`.

---

## 6. Reglas de negocio y validaciones

### PRO-021 — Horarios sólo lunes a viernes (RN07)
`diaSemana` ∈ {1,2,3,4,5}. `6`/`7` → `400`.

### PRO-022 — Franjas coherentes
`horaInicio < horaFin`; sin solapamiento entre franjas del mismo día; granularidad múltiplo del bloque de agenda (constante compartida, ver `SER-026`).

### PRO-023 — Matrícula única
`409` si la matrícula ya existe.

### PRO-024 — Al menos una franja para operar
Un profesional sin horarios no aparece como "disponible" para Agenda (no es error, pero Agenda lo trata como sin disponibilidad, RN19).

---

## 7. Seguridad y control de acceso

### PRO-025 — RBAC por endpoint
Alta/edición/horarios: `@Roles(Rol.ASISTENTE, Rol.DUENO)` (+ el propio profesional para sus horarios). Lectura (`GET`, `/:id`, `/:id/horarios`, `?ids=`): autenticado. `_estado`: sin rol.

---

## 8. Consumidores de Profesionales

### PRO-026 — Vía REST, sin importar el service
Servicios (`GET /api/profesionales?ids=`, `SER-021`), Agenda (`GET /api/profesionales/:id/horarios`), Turnos (`GET /api/profesionales/:id` para validar existencia), Métricas (`ProfesionalResumen` + horas). Cada uno con su `ProfesionalesClient` y degradación propia.

---

## 9. Frontend

### PRO-027 — ABM de profesionales (perfil ASISTENTE / DUENO)
Listado, alta (con especialidad y matrícula), edición, baja lógica. Muestra credencial inicial generada.

### PRO-028 — Editor de horarios de atención
Grilla lunes-a-viernes con franjas horarias; valida RN07 y solapamiento en cliente antes de `PUT /horarios`.

### PRO-029 — Métodos de API
`lib/api.ts`: `profesionales.listar`, `profesionales.obtener`, `profesionales.crear`, `profesionales.actualizar`, `profesionales.horarios`, `profesionales.definirHorarios`.

---

## 10. Datos de prueba y configuración

### PRO-030 — Seed
Crear `Profesional` para `profesional@syssalud.com` (`Usuario` ya creado por el seed de Auth): especialidad p. ej. "Dermatología", matrícula demo, horarios lunes-a-viernes 09:00–13:00 y 14:00–18:00. Idempotente por `usuarioId`.

### PRO-031 — Variables de entorno
`AUTH_API_URL`, `PROFESIONALES_VALIDAR_AUTH` (`lenient`|`strict`). El tamaño de bloque de agenda vive en shared-types (`SER-026`).

---

## 11. Pruebas

### PRO-032 — Unit `ProfesionalesService`
Alta OK; matrícula duplicada → `409`; `diaSemana=6` → `400`; franjas solapadas → `400`; Auth caído en `lenient` → `PENDIENTE_CREDENCIALES` + `WARN`.

### PRO-033 — Costura
`AuthClient` con HTTP mockeado (OK / `404` / timeout → fallback).

### PRO-034 — Controller / RBAC
PACIENTE no puede dar de alta (`403`); sí puede leer `?ids=`. El propio profesional edita sus horarios.

### PRO-035 — Contract test con Servicios
Verificar que `ProfesionalResumen` devuelto por `GET /api/profesionales?ids=` cumple exactamente el fixture que consume `SER-021`.

---

## 12. No funcionales y documentación

### PRO-036 — Errores consistentes
`404` "El profesional no está registrado." (CUU05 alt 1.b), mensajes en español.

### PRO-037 — Documentación
`README.md` del backend con `/api/profesionales`; JSDoc referenciando RN07 y las costuras entrantes de Servicios/Agenda; diagrama de dependencias.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| PRO-001…PRO-005, PRO-019, PRO-020, PRO-026 | `docs/_comun-arquitectura.md` |
| PRO-006, PRO-010, PRO-023 | soporte de `serv = ... + 1{id_prof}n`; datos del profesional |
| PRO-007, PRO-016, PRO-021, PRO-022 | RN07; "cada servicio está asociado a uno o más profesionales... con su horario" |
| PRO-013, PRO-015, PRO-035 | costuras entrantes de Servicios (`SER-021`) y Agenda |
| PRO-014, PRO-036 | CUU05 alt 1.b (profesional inexistente) |
| PRO-030 | seed alineado con el usuario demo `profesional@syssalud.com` |
