# Módulo Historia Clínica — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU09 — Gestionar historia clínica.
**Pareja responsable:** Pareja A (Pacientes & Historia Clínica).
**Estado actual:** esqueleto (`historia-clinica.module.ts`, `historia-clinica.controller.ts` con `GET /historia-clinica` de ping, `historia-clinica.service.ts` con `estado()`). Sin entidad, DTOs, persistencia, RBAC ni frontend.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- Actor primario: Profesional médico (PROF). **Ningún otro rol** accede (RN10). RN02: la HC es propiedad exclusiva del paciente.
- Precondición de negocio: el paciente debe estar registrado **y debe existir una consulta médica asociada** (asistencia al turno).
- Camino básico: (1) PROF busca por nombre o documento → (2) el sistema muestra la HC digital (datos personales, consultas previas, observaciones, antecedentes) → (3) PROF elige "registrar nueva información" → (4) ingresa observaciones, tratamientos, antecedentes → (5) el sistema valida, registra y actualiza la fecha de última modificación.
- Alternativos: `2.a` el paciente no tiene HC previa → ofrecer inicializarla en blanco y seguir en paso 3; `2.b` no se encuentra el paciente → error "No se encontraron pacientes con los criterios ingresados." Fin CU.
- Diccionario: `hist_clin = pac + id_hist_clin + tratamientos + observaciones + antecedentes`;
  `historia_clinica = idHistoria + nomAppPac + telefono + correo + 0{idTurno + fecha + observaciones + antecedentes + tratamientos + fechaActualizacion}n`;
  `criterio_busqueda = [dni_pac | (nom_pac + ape_pac)]`; `reg_clinico = observaciones + antecedentes + tratamientos`;
  `mensaje_exito = "Historia clínica actualizada correctamente."`

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Pacientes | resolver el paciente por `dni` o `nombre+apellido`; datos personales (`nomAppPac`, `telefono`, `correo`) | `PacientesClient` → `GET /api/pacientes?buscar=` |
| **Saliente** | Turnos | validar la precondición "consulta asociada" (turno asistido de ese paciente con este profesional); listar `idTurno + fecha` | `TurnosClient` → `GET /api/turnos?pacienteId=&profesionalId=&estado=ASISTIDO` |
| **Entrante** | — | ninguna. La HC **no se expone** a otros módulos ni roles (RN10). | — |

---

## 1. Principios de arquitectura

### HCL-001 — Sin acoplamiento en proceso
No importa services/entidades de otros feature modules; usa `PacientesClient` y `TurnosClient` (HTTP). No exporta su service.

### HCL-002 — Costuras REST con degradación elegante
Si Pacientes/Turnos no responden: en modo `lenient` se permite consultar/crear entradas resolviendo el paciente por `pacienteId` directo y sin exigir turno asistido, con `WARN`; en `strict` se bloquea con `424`. Flag `HISTORIA_VALIDAR_TURNOS=lenient|strict`.

### HCL-003 — Contratos compartidos
`HistoriaClinica`, `EntradaClinica`, `CrearEntradaRequest`, `BuscarHistoriaQuery` en `packages/shared-types` con fixture.

### HCL-004 — Readiness observable
`GET /api/historia-clinica/_estado` → `{ modulo:'historia-clinica', dependencias:{ pacientes, turnos }, modoValidacion }`. **Sin datos clínicos** en la respuesta.

### HCL-005 — Actualizar el JSDoc del stub
Reemplazar el `TODO (Pareja A)` por: costuras REST a Pacientes/Turnos + `@Roles(Rol.PROFESIONAL)` exclusivo.

---

## 2. Modelo de datos y persistencia

### HCL-006 — Entidad `HistoriaClinica`
`historias_clinicas`: `id` (uuid), `pacienteId` (uuid, único — una HC por paciente, RN02), `creadaEn`, `actualizadaEn`.

### HCL-007 — Entidad `EntradaClinica`
`entradas_clinicas`: `id` (uuid), `historiaId` (uuid, FK), `turnoId` (uuid, nullable — la consulta que la origina), `profesionalId` (uuid — autor), `fecha` (date), `observaciones` (text), `tratamientos` (text), `antecedentes` (text), `fechaActualizacion` (timestamp). Índice por `historiaId`, orden por `fecha` desc.

### HCL-008 — Registrar entidades
`TypeOrmModule.forFeature([HistoriaClinica, EntradaClinica])` en el módulo + ambas en `data-source.ts`.

### HCL-009 — Inmutabilidad de entradas
Las entradas no se borran; una corrección es una entrada nueva. `PATCH` sólo permitido sobre la entrada propia del mismo día por su autor (opcional; por defecto, append-only).

---

## 3. Contratos compartidos (`packages/shared-types`)

### HCL-010 — DTOs
- `HistoriaClinica`: `idHistoria`, `pacienteId`, `nomAppPac`, `telefono`, `correo`, `entradas: EntradaClinica[]`.
- `EntradaClinica`: `id`, `idTurno`, `fecha`, `observaciones`, `antecedentes`, `tratamientos`, `fechaActualizacion`, `autor` (`ProfesionalResumen` best-effort).
- `CrearEntradaRequest`: `observaciones`, `antecedentes`, `tratamientos`, `turnoId?`.
- `BuscarHistoriaQuery`: `{ dni?: string; nombre?: string; apellido?: string }`.

### HCL-011 — Exportar
`export type { ... }` en `src/index.ts` + `historiaClinicaFixture`.

---

## 4. API — endpoints que Historia Clínica expone

### HCL-012 — `GET /api/historia-clinica` — buscar y traer HC (CUU09 pasos 1–2)
Query `?dni=` o `?nombre=&apellido=`. Resuelve el paciente vía `PacientesClient`; si hay varios coincidentes devuelve la lista de `PacienteResumen` para desambiguar; si hay uno, devuelve su `HistoriaClinica` (o `204`/marca "sin HC previa" para el alt `2.a`).
`2.b` sin coincidencias → `404` "No se encontraron pacientes con los criterios ingresados."
**RBAC:** `@Roles(Rol.PROFESIONAL)`.

### HCL-013 — `GET /api/historia-clinica/:pacienteId` — HC por paciente
Devuelve la `HistoriaClinica` completa. `404` si el paciente no existe; `{ existe:false }` si no tiene HC.
**RBAC:** `@Roles(Rol.PROFESIONAL)`.

### HCL-014 — `POST /api/historia-clinica/:pacienteId` — inicializar HC (alt 2.a)
Crea la `HistoriaClinica` en blanco vinculada al paciente. Idempotente. `201`.
**RBAC:** `@Roles(Rol.PROFESIONAL)`.

### HCL-015 — `POST /api/historia-clinica/:pacienteId/entradas` — nueva entrada (pasos 3–5)
`CrearEntradaRequest`. Valida la precondición de consulta asociada vía `TurnosClient` (HCL-018) según el modo. Setea `profesionalId = sub`, `fechaActualizacion = now`. `201` con la entrada; mensaje `"Historia clínica actualizada correctamente."`
**RBAC:** `@Roles(Rol.PROFESIONAL)`.

### HCL-016 — Reubicar el ping
`GET /api/historia-clinica` pasa a ser el buscador (HCL-012); el `estado()` va a `GET /api/historia-clinica/_estado` (HCL-004).

---

## 5. Costuras salientes

### HCL-017 — `PacientesClient`
`buscar(criterio): Promise<PacienteResumen[]>` → `GET /api/pacientes?buscar=`; `obtener(id): Promise<Paciente>` → `GET /api/pacientes/:id` (para `nomAppPac`, `telefono`, `correo`). Base URL `PACIENTES_API_URL`. Degradación: si no responde, `GET /:pacienteId` sigue sirviendo la HC con datos personales `null` + `WARN`; el buscador devuelve `503`/`424` según modo.

### HCL-018 — `TurnosClient`
`turnosAsistidos(pacienteId, profesionalId): Promise<{ idTurno; fecha }[]>` → `GET /api/turnos?pacienteId=&profesionalId=&estado=ASISTIDO`. Degradación: en `lenient` se omite la validación de precondición y se permite la entrada con `turnoId` nulo + `WARN`; en `strict`, `424` si no hay turno asistido.

---

## 6. Reglas de negocio y seguridad

### HCL-019 — Acceso exclusivo del profesional (RN10)
**Todos** los endpoints con `@Roles(Rol.PROFESIONAL)` + `JwtAuthGuard` + `RolesGuard`. Cualquier otro rol → `403`. No hay endpoint de lectura para ASISTENTE, DUENO ni el propio PACIENTE. El `_estado` no expone contenido clínico.

### HCL-020 — Una HC por paciente (RN02)
`pacienteId` único en `historias_clinicas`; `POST` de inicialización idempotente.

### HCL-021 — Precondición de consulta asociada
La creación de entradas exige (modo `strict`) un turno `ASISTIDO` del paciente con el profesional autor. En `lenient` se registra igual con `WARN` y `turnoId` nulo.

### HCL-022 — Trazabilidad de autoría
Cada entrada guarda `profesionalId` (del `sub`) y `fechaActualizacion`. No se puede crear en nombre de otro profesional.

### HCL-023 — Validación de contenido
`observaciones`, `tratamientos`, `antecedentes`: al menos uno no vacío; límites de longitud razonables.

---

## 7. Consumidores

### HCL-024 — Ninguno directo
Historia Clínica no expone datos a otros módulos (RN10). Si Métricas de desempeño necesita "cantidad de pacientes atendidos", lo deriva de **Turnos** (`estado = ASISTIDO`), no de este módulo.

---

## 8. Frontend

### HCL-025 — Pantalla "Gestionar Historia Clínica" (panel del profesional)
Búsqueda por nombre o documento → vista de la HC (datos personales + timeline de entradas) → formulario de nueva entrada (observaciones, tratamientos, antecedentes). Mensajes de los alt `2.a` (ofrecer inicializar) y `2.b` (no encontrado).
Sólo visible para rol `PROFESIONAL`.

### HCL-026 — Métodos de API
`lib/api.ts`: `historiaClinica.buscar`, `historiaClinica.obtener`, `historiaClinica.inicializar`, `historiaClinica.agregarEntrada`.

---

## 9. Datos de prueba y configuración

### HCL-027 — Seed (opcional)
Una `HistoriaClinica` para el paciente demo con 1–2 entradas de ejemplo, autoría del profesional demo. Idempotente por `pacienteId`.

### HCL-028 — Variables de entorno
`PACIENTES_API_URL`, `TURNOS_API_URL`, `HISTORIA_VALIDAR_TURNOS` (`lenient`|`strict`). Documentar en `README.md` y `.env`.

---

## 10. Pruebas

### HCL-029 — Unit `HistoriaClinicaService`
Buscar sin coincidencias → `404` con el mensaje exacto; inicializar es idempotente; crear entrada setea autor y fecha; en `strict` sin turno asistido → `424`; en `lenient` → entrada con `WARN`.

### HCL-030 — Costuras
`PacientesClient` / `TurnosClient` con HTTP mockeado (OK / `404` / timeout → fallback).

### HCL-031 — Controller / RBAC (RN10)
`ASISTENTE`, `DUENO` y `PACIENTE` → `403` en **todos** los endpoints; `PROFESIONAL` → OK.

### HCL-032 — e2e CUU09
Profesional busca paciente → sin HC → inicializa → agrega entrada → la entrada aparece en el timeline con fecha de actualización.

---

## 11. No funcionales y documentación

### HCL-033 — Errores y mensajes
Textos del diccionario: "No se encontraron pacientes con los criterios ingresados.", "El paciente seleccionado no cuenta con una historia clínica previa, ¿desea inicializarla?", "Historia clínica actualizada correctamente."

### HCL-034 — Confidencialidad
Registrar en log de auditoría cada acceso de lectura a una HC (profesional, paciente, timestamp). No incluir contenido clínico en logs ni en el `_estado`.

### HCL-035 — Documentación
`README.md` del backend con `/api/historia-clinica`; JSDoc referenciando RN02, RN10 y CUU09; nota de que el módulo no tiene consumidores REST por diseño.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| HCL-001…HCL-005, HCL-016, HCL-017, HCL-018 | `docs/_comun-arquitectura.md` |
| HCL-006, HCL-007, HCL-010 | `historia_clinica = idHistoria + nomAppPac + telefono + correo + 0{idTurno + fecha + observaciones + antecedentes + tratamientos + fechaActualizacion}n` |
| HCL-012, HCL-013, HCL-025 | CUU09 pasos 1–2; `criterio_busqueda = [dni_pac | (nom_pac + ape_pac)]` |
| HCL-014 | CUU09 alt 2.a (inicializar HC en blanco) |
| HCL-012 (`2.b`), HCL-033 | CUU09 alt 2.b (paciente no encontrado) |
| HCL-019, HCL-024, HCL-031, HCL-034 | RN10 (acceso exclusivo del profesional) |
| HCL-020 | RN02 (HC propiedad exclusiva del paciente) |
| HCL-021 | Precondición de negocio: "debe existir una consulta médica asociada" |
