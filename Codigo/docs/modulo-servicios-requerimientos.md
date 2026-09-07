# Módulo Servicios — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU10 — Mantener catálogo de servicios
**Pareja responsable:** Pareja B (Servicios & Profesionales)
**Estado actual:** esqueleto (`servicios.module.ts`, `servicios.controller.ts` con un único `GET /servicios` de ping, `servicios.service.ts` con `estado()` que devuelve `{ estado: 'pendiente' }`). No hay entidad, DTOs, persistencia, RBAC ni frontend.

## Estrategia de desarrollo (decisión de arquitectura)

Cada módulo se desarrolla **de forma independiente**. Donde un módulo necesita datos de otro, se deja
**la conexión REST lista y cableada aunque el módulo destino todavía no exista o no responda**:

- El módulo arranca y **todos sus endpoints propios funcionan** aunque sus dependencias estén caídas.
- La dependencia se implementa como un **cliente HTTP dedicado** (una "costura") apuntando al endpoint REST
  del otro módulo, con **degradación elegante** (fallback documentado + log `WARN`) mientras no haya respuesta.
- El contrato de esa costura (tipos + ejemplo/fixture) vive en `packages/shared-types`, así ambos lados
  programan contra la misma forma y, cuando el módulo destino esté listo, **solo se apunta la URL** y se pasa
  a modo estricto: sin cambios de código.
- Nada de imports en proceso entre feature modules (no `import { OtroService }` ni `import { OtraEntity }`).

Dependencias del módulo Servicios:

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** (Servicios consume) | Profesionales | validar que los `profesionalIds` existen y son profesionales; nombres para mostrar | `ProfesionalesClient` → `GET /api/profesionales?ids=` |
| **Entrante** (otros consumen Servicios) | Turnos, Agenda, Pagos, Métricas | duración y precio del servicio, catálogo, profesionales que lo brindan | endpoints REST que Servicios expone (`GET /api/servicios...`) |

> Nota: hoy todo corre en un único proceso Nest en `:4000`, así que el `ProfesionalesClient` ya puede
> probarse contra el controlador *stub* de Profesionales del mismo proyecto.

## Contexto de negocio (fuente: `Grupo_18-SI-2026.pdf`)

- Diccionario de datos CUU10: `serv = id_serv + nom_serv + desc_serv + duracion_serv + precio_serv + 1{id_prof}n`
  (un servicio tiene **uno o más** profesionales asociados).
- Actor primario: **Asistente administrativo (ADM)**. Otros: Profesionales (PROF).
- Camino básico CUU10: (1) nombre y descripción → (2) profesional(es) que lo brindan → (3) duración → (4) precio → (5) confirmar.
- Alternativos: `1.a` modificar servicio, `1.b` eliminar servicio, `4.a` modificar precio.
- "El asistente tendrá a su cargo el mantenimiento del catálogo de servicios: podrá incorporar nuevos servicios, modificar los existentes o darlos de baja."
- RN03: un turno está constituido por **un servicio específico**, un profesional asignado, una fecha y una hora.
- Precondición de otros CUU (solicitar turno): "el catálogo de servicios ... está configurado".
- En la reserva de turno el sistema muestra `servicios_disponibles = 1{id_serv + nom_serv + precio_serv}n` y la selección es `id_serv + id_prof`.
- Métricas: "cantidad de turnos por servicio" y "cantidad de turnos por servicio realizado" requieren id/nombre de servicio disponible.

## Convenciones del repo a respetar

- Backend NestJS + TypeORM + PostgreSQL, `synchronize: true` (sin migraciones formales todavía), prefijo global `/api`, `ValidationPipe` con `whitelist` + `forbidNonWhitelisted`.
- Tipos compartidos en `packages/shared-types` con **exports explícitos** en `src/index.ts` (no `export *`).
- DTOs de request en shared-types como `interface`; clases con `class-validator` en el backend que las `implements`.
- RBAC con `JwtAuthGuard` + `RolesGuard` + `@Roles(...)` (`src/shared/guards`, `src/shared/decorators`).
- JSDoc en español, referenciando CUU/RN, igual que el módulo Auth.
- Frontend React + Vite, cliente HTTP centralizado en `syssalud-frontend/src/lib/api.ts`.

---

## 1. Principios de arquitectura — módulos independientes

### SER-001 — Sin acoplamiento en proceso entre módulos
El módulo Servicios no importa services ni entidades de otros feature modules, y no exporta `ServiciosService`
para inyección cruzada. `servicios.module.ts` solo declara sus propios providers + `HttpModule` + infraestructura compartida (`shared/`).
**Aceptación:** `grep` de imports desde `modules/servicios` hacia `modules/<otro>` no arroja resultados; quitar `exports: [ServiciosService]` del módulo.

### SER-002 — Toda dependencia entre módulos se resuelve por REST
Cada necesidad de datos de otro módulo se implementa con un **cliente HTTP dedicado** (`*Client`) que apunta
al endpoint REST público del otro módulo (base URL por variable de entorno). Nada de llamadas directas a repos/servicios ajenos.
**Aceptación:** la única forma en que Servicios obtiene datos de Profesionales es vía `ProfesionalesClient` (SER-021).

### SER-003 — Degradación elegante de las costuras
Si la dependencia REST no responde (conexión rechazada, `404`, timeout), el módulo **no falla al arrancar** y
sus endpoints propios siguen operativos. La costura devuelve un fallback documentado y registra `WARN` con el detalle.
Un flag `SERVICIOS_VALIDAR_PROFESIONALES=lenient|strict` (default `lenient` hoy, `strict` cuando Profesionales esté listo)
controla si la ausencia de validación degrada o bloquea.
**Aceptación:** con Profesionales caído, `POST /api/servicios` responde `201` en modo `lenient` y loguea el warning; en `strict` responde `503`/`424` con mensaje claro.

### SER-004 — Contratos tipados y fixtures compartidos
Cada costura declara en `packages/shared-types` su tipo de request/response y un **fixture de ejemplo** que
sirve de doble de prueba y de especificación para el equipo que implemente el otro lado.
**Aceptación:** existe `ProfesionalResumen` + `profesionalResumenFixture` (o equivalente) exportado desde shared-types.

### SER-005 — Readiness de dependencias observable
`GET /api/servicios/_estado` reporta la alcanzabilidad de cada dependencia:
`{ modulo: 'servicios', dependencias: { profesionales: 'ok' | 'no-disponible' }, modoValidacion: 'lenient' | 'strict' }`.
**Aceptación:** el endpoint refleja en tiempo real si el `ProfesionalesClient` obtuvo respuesta en el último chequeo.

---

## 2. Modelo de datos y persistencia

### SER-006 — Entidad `Servicio`
Crear `syssalud-backend/src/modules/servicios/entities/servicio.entity.ts` con TypeORM.
**Campos:** `id` (uuid, PK), `nombre` (string, único, obligatorio), `descripcion` (text, obligatorio), `duracionMin` (int, minutos), `precio` (numeric(12,2), ARS), `activo` (boolean, default `true`), `creadoEn` (`@CreateDateColumn`), `actualizadoEn` (`@UpdateDateColumn`).
**Aceptación:** la tabla `servicios` se crea vía `autoLoadEntities` + `synchronize`; `nombre` con índice único; `precio` se lee como `number` con 2 decimales.

### SER-007 — Asociación a profesionales por IDs opacos (sin FK a otro módulo)
El vínculo `1{id_prof}n` se guarda **dentro del dominio de Servicios**, sin FK ni `ManyToMany` a una entidad de otro módulo:
- Opción recomendada: tabla propia `servicio_profesionales (servicio_id uuid, profesional_id uuid, PK compuesta)` con entidad `ServicioProfesional` e índice por `profesional_id` (permite responder "servicios de un profesional" sin acoplar).
- MVP aceptable: columna `profesionalIds uuid[]` (array Postgres) en `servicios`.
Los `profesional_id` son UUID opacos; su validación de existencia es responsabilidad de la costura (SER-023).
**Aceptación:** crear/editar persiste el conjunto de ids; el borrado de un servicio limpia sus filas de join.

### SER-008 — Registrar la entidad en el módulo y en el datasource de seed
Añadir `TypeOrmModule.forFeature([Servicio, ServicioProfesional])` en `servicios.module.ts` e incluir esas entidades en el array `entities` de `src/database/data-source.ts` (lo usa el script de seed).
**Aceptación:** `npm run seed` inicializa sin error de metadata de entidad.

### SER-009 — Baja lógica (no borrado físico)
La eliminación es baja lógica (`activo = false`): los turnos históricos referencian el servicio (RN03) y las métricas los agrupan por servicio.
**Aceptación:** `DELETE` no ejecuta `DELETE` SQL sobre `servicios`; el registro permanece y deja de listarse cuando se pide "solo activos"; se puede reactivar.

---

## 3. Contratos compartidos (`packages/shared-types`)

### SER-010 — DTOs de servicio en shared-types
Crear `src/dto/servicio.dto.ts` con:
- `Servicio` — respuesta completa: `id`, `nombre`, `descripcion`, `duracionMin`, `precio`, `activo`, `profesionales: ProfesionalResumen[]`, `creadoEn`, `actualizadoEn`.
- `ServicioResumen` — para catálogos de selección: `id`, `nombre`, `precio`, `duracionMin` (alineado con `servicios_disponibles`).
- `CrearServicioRequest` — `nombre`, `descripcion`, `duracionMin`, `precio`, `profesionalIds: string[]`.
- `ActualizarServicioRequest` — `Partial<CrearServicioRequest>` + `activo?` (soporta `1.a`, `4.a` y reactivación).

### SER-011 — Contrato + fixture de la costura Profesionales
En `src/dto/profesionales-contract.dto.ts` (o dentro del dominio Profesionales cuando exista): `ProfesionalResumen` (`id`, `nombreCompleto`, `activo`) y un `profesionalResumenFixture`. Este es el contrato que `ProfesionalesClient` espera de `GET /api/profesionales?ids=`.
**Aceptación:** el stub del cliente y sus tests consumen el fixture; el equipo de Profesionales tiene la forma objetivo documentada.

### SER-012 — Exportar los tipos nuevos
Añadir los `export type { ... }` (y el fixture como `export const`) en `packages/shared-types/src/index.ts` y reconstruir el paquete (`dist/cjs`, `dist/esm`).
**Aceptación:** `import { Servicio, ServicioResumen, ProfesionalResumen } from '@syssalud/shared-types'` resuelve en backend y frontend.

---

## 4. API backend — endpoints que Servicios expone (CRUD CUU10)

### SER-013 — DTOs de request con `class-validator`
`dto/crear-servicio.dto.ts` y `dto/actualizar-servicio.dto.ts` que `implements` los tipos de SER-010.
**Reglas:** `nombre` `@IsString @IsNotEmpty`; `descripcion` `@IsString @IsNotEmpty`; `duracionMin` `@IsInt @IsPositive` (+ SER-026); `precio` `@IsNumber({maxDecimalPlaces:2}) @Min(0)`; `profesionalIds` `@IsArray @ArrayNotEmpty @IsUUID('4', {each:true})`. `Actualizar` con `PartialType` / `@IsOptional`.

### SER-014 — `POST /api/servicios` — Alta (camino básico CUU10)
Crea un servicio con nombre, descripción, profesionales, duración y precio. Responde `201` con el `Servicio` creado.
**Aceptación:** cubre pasos 1–5 del camino básico; `409` si el nombre ya existe (SER-025); comportamiento ante `profesionalIds` no verificables según SER-003/SER-023.

### SER-015 — `GET /api/servicios` — Listado
Lista servicios. Query `?soloActivos=true` (default `true`; la pantalla de ABM pide `false` para ver también los dados de baja).
**Aceptación:** cada ítem incluye `profesionales` (enriquecidos best-effort, SER-024); ordenado por `nombre`.

### SER-016 — `GET /api/servicios/:id` — Detalle
Devuelve un servicio por id con sus profesionales. `404` si no existe.

### SER-017 — `GET /api/servicios/:id/profesionales` — Profesionales del servicio
Devuelve los `ProfesionalResumen` asociados (para que Turnos filtre el selector de profesional tras elegir servicio: `selección = id_serv + id_prof`). Si la costura está caída, devuelve al menos los `{ id }` conocidos.

### SER-018 — `PATCH /api/servicios/:id` — Modificación
Modifica nombre/descripción (`1.a`), reasigna profesionales, cambia duración, cambia **solo** el precio (`4.a`) o reactiva (`activo: true`). Actualización parcial.
**Aceptación:** enviar solo `precio` no exige el resto; se revalida unicidad de nombre; `404` si no existe.

### SER-019 — `DELETE /api/servicios/:id` — Baja (`1.b`)
Baja lógica (SER-009). Responde `204`.
**Aceptación:** el servicio desaparece de `?soloActivos=true`; si Turnos está disponible, la baja se rechaza con `409` cuando existan turnos futuros con ese servicio (vía consulta REST a Turnos si esa costura se agrega; si no, se documenta como limitación temporal).

### SER-020 — Reubicar el endpoint de estado
Mover el `GET /servicios` actual (que devuelve `{ estado: 'pendiente' }`) a `GET /api/servicios/_estado` con el payload de readiness de SER-005, para que `GET /api/servicios` sea el listado real.

---

## 5. Costura saliente — `ProfesionalesClient`

### SER-021 — Cliente HTTP a Profesionales
`servicios/clients/profesionales.client.ts`, provider inyectable. Usa `@nestjs/axios` (`HttpModule`) o `fetch`.
Base URL desde `PROFESIONALES_API_URL` (default `http://localhost:4000/api`). Métodos:
- `resumenPorIds(ids: string[]): Promise<ProfesionalResumen[]>` → `GET /api/profesionales?ids=a,b,c`
- `existenYSonProfesionales(ids: string[]): Promise<{ validos: string[]; invalidos: string[] }>`
**Aceptación:** apunta a un endpoint REST real; hoy pega contra el stub de Profesionales del mismo proceso.

### SER-022 — Degradación elegante + doble de prueba
Ante error de red / `404` / timeout (configurable, ~2s): loguear `WARN "Profesionales API no disponible (<url>): ..."` y devolver fallback — `resumenPorIds` retorna `{ id, nombreCompleto: null, activo: null }` por id; `existenYSonProfesionales` retorna todos como `validos` en modo `lenient`. Proveer `ProfesionalesClientStub` que sirve el fixture (SER-011) para tests.
**Aceptación:** los tests del módulo Servicios corren sin levantar Profesionales.

### SER-023 — Validación de `profesionalIds` delegada a la costura
En alta/modificación, tras validar que son UUID bien formados (SER-013), llamar a `existenYSonProfesionales`:
- modo `lenient`: si hay `invalidos` y la costura respondió, `400` con la lista; si la costura no respondió, aceptar y loguear `WARN`.
- modo `strict`: si la costura no responde, `424 Failed Dependency` / `503`; si hay `invalidos`, `400`.
**Aceptación:** el cambio de comportamiento entre "hoy" y "Profesionales listo" es solo el flag/URL, sin tocar código.

### SER-024 — Enriquecimiento best-effort de nombres
Las respuestas que incluyen `profesionales` (`GET /servicios`, `/:id`, `/:id/profesionales`) intentan poblar `nombreCompleto` vía `resumenPorIds`; si la costura no responde, devuelven `nombreCompleto: null` sin fallar la petición.

---

## 6. Reglas de negocio y validaciones

### SER-025 — Nombre único
No pueden coexistir dos servicios con el mismo `nombre` (case-insensitive, sin espacios sobrantes). Violación → `409 Conflict` con mensaje claro.

### SER-026 — Duración válida y compatible con la agenda
`duracionMin` entero positivo, múltiplo del tamaño de bloque de agenda (p. ej. 15) y en rango razonable (p. ej. 15–480). El tamaño de bloque es una **constante compartida** en shared-types (misma que usará Agenda/Turnos).
**Aceptación:** `20` con bloque 15 → `400`; `30` → OK.

### SER-027 — Al menos un profesional
`profesionalIds` no vacío y con formato UUID siempre (validación local). La existencia real y el rol se verifican por la costura según SER-023.

### SER-028 — Precio no negativo
`precio >= 0`, máximo 2 decimales, ARS implícito. `null` / negativo / 3 decimales → `400`.

---

## 7. Seguridad y control de acceso

### SER-029 — RBAC por endpoint
`JwtAuthGuard` + `RolesGuard`:
- **Escritura** (`POST`, `PATCH`, `DELETE`): `@Roles(Rol.ASISTENTE)` (sumar `Rol.DUENO` si se confirma que el dueño también administra el catálogo — el PDF lo lista como objetivo del stakeholder Dueño).
- **Lectura** (`GET /servicios`, `/:id`, `/:id/profesionales`): cualquier usuario autenticado (el paciente necesita ver el catálogo para reservar).
- `GET /api/servicios/_estado`: público o autenticado, sin rol.
**Aceptación:** PACIENTE → `POST` da `403`; `GET` da `200`.

---

## 8. Consumidores de Servicios (Turnos / Agenda / Pagos) — vía REST

### SER-030 — Los consumidores no importan `ServiciosService`
Turnos, Agenda, Pagos y Métricas obtienen datos de Servicios **solo por REST** (`GET /api/servicios`, `/:id`, `/:id/profesionales`), tipando la respuesta con los DTOs de shared-types. Cada uno implementa su propio `ServiciosClient` con la misma política de degradación (SER-003).
**Aceptación:** ningún feature module importa desde `modules/servicios`.

### SER-031 — Contrato de reserva de turno
Turnos persiste `servicioId` en el turno (RN03), toma `duracionMin` y `precio` de `GET /api/servicios/:id` para calcular el bloque de agenda y el monto de pago, y valida "el profesional elegido brinda el servicio" con `GET /api/servicios/:id/profesionales`.
**Aceptación:** documentado en este archivo y en el contrato de Turnos; probable con el stub de Servicios ya en pie.

### SER-032 — Estabilidad de id/nombre para métricas
`id` y `nombre` del servicio se conservan tras la baja (consecuencia de SER-009), para que "turnos por servicio" y "turnos por servicio realizado" sigan siendo correctas históricamente.

---

## 9. Frontend — ABM y consumo

### SER-033 — Métodos de API en el cliente
Agregar a `syssalud-frontend/src/lib/api.ts`:
`servicios.listar(token, soloActivos?)`, `servicios.obtener(token, id)`, `servicios.profesionales(token, id)`, `servicios.crear(token, data)`, `servicios.actualizar(token, id, data)`, `servicios.baja(token, id)`. Reutilizar `request<T>` y el manejo de errores existente.

### SER-034 — Pantalla ABM "Catálogo de servicios"
Vista para rol ASISTENTE (módulo frontend `staff` o nuevo `services`): tabla con nombre, duración, precio, profesionales, estado; acciones alta / edición / baja / reactivación. Formulario de alta con selección múltiple de profesionales, duración y precio validados en cliente; refleja errores `409` / `400` / `424` del backend.

### SER-035 — Selector de servicio en el flujo de solicitud de turno
La pantalla de agendar turno consume `GET /api/servicios?soloActivos=true` y, al elegir servicio, filtra el selector de profesionales con `GET /api/servicios/:id/profesionales`. Muestra el precio junto al nombre.

### SER-036 — Enlace en el menú
Agregar "Servicios" al menú de navegación para ASISTENTE (y DUENO si aplica SER-029).

---

## 10. Datos de prueba y configuración

### SER-037 — Seed de servicios demo
Extender `src/database/seed.ts` con 3–5 servicios de medicina estética / cirugía plástica (p. ej. "Consulta dermatológica", "Aplicación de toxina botulínica", "Peeling químico"), asociados por id a `profesional@syssalud.com`, con duración y precio realistas. Idempotente (saltar si el nombre ya existe).

### SER-038 — Variables de entorno
`PROFESIONALES_API_URL` (default `http://localhost:4000/api`), `SERVICIOS_VALIDAR_PROFESIONALES` (`lenient` | `strict`, default `lenient`). Documentarlas en el `README.md` del backend y en el `.env` de ejemplo. El tamaño de bloque de agenda vive en shared-types (SER-026), no como env.

---

## 11. Pruebas

### SER-039 — Unit tests de `ServiciosService`
Repos mockeados: alta OK, nombre duplicado → `409`, `profesionalIds` vacío → error, baja lógica marca `activo=false`, actualización solo-precio, `_estado` refleja la última salud de la costura.

### SER-040 — Tests de `ProfesionalesClient` (contract test)
Con `nock` / mock de HTTP: respuesta OK mapea al fixture (SER-011); `404` / ECONNREFUSED / timeout → fallback + `WARN`, sin excepción propagada. `ProfesionalesClientStub` sirve el fixture.

### SER-041 — Tests de `ServiciosController` / RBAC
Mapeo de rutas y códigos (`201` / `200` / `204` / `404`); PACIENTE no puede escribir (`403`), sí leer; `_estado` accesible.

### SER-042 — e2e del catálogo con dependencia caída y viva
`POST → GET → PATCH precio → DELETE` como ASISTENTE: una corrida con Profesionales mockeado respondiendo (modo `strict`, valida ids) y otra con la costura caída (modo `lenient`, degrada con warning).

---

## 12. No funcionales y documentación

### SER-043 — Consistencia de errores y validación
Todos los endpoints bajo `ValidationPipe` global; mensajes en español y accionables; formato compatible con `extraerMensaje` del cliente (string o array). Errores de dependencia usan `424` / `503` con cuerpo claro.

### SER-044 — Documentación del módulo
JSDoc en español en entidad, servicio, controlador y `ProfesionalesClient` referenciando CUU10 / RN03; actualizar `README.md` del backend con los endpoints de `/api/servicios` y la costura a Profesionales (URL, flag, comportamiento degradado); reemplazar el `TODO (Pareja B)` de `servicios.service.ts`; incluir un diagrama simple de costuras (Servicios ↔ Profesionales / Turnos).

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| SER-001…SER-005 | Decisión de arquitectura: módulos independientes + costuras REST cableadas |
| SER-006, SER-010 | Diccionario `serv = id_serv + nom_serv + desc_serv + duracion_serv + precio_serv + 1{id_prof}n` |
| SER-007, SER-021–SER-024, SER-027 | `1{id_prof}n`; paso 2 del camino básico; "asociado a uno o más profesionales" (resuelto por costura, no por FK) |
| SER-014 | Camino básico CUU10 pasos 1–5 |
| SER-018 | Alternativos `1.a` (modificar), `4.a` (modificar precio) |
| SER-019, SER-009 | Alternativo `1.b` (eliminar); "darlos de baja" |
| SER-025, SER-026, SER-028 | "Cada servicio tiene definida su duración y precio" |
| SER-029 | Actor primario ADM; "el asistente tendrá a su cargo el mantenimiento del catálogo" |
| SER-017, SER-030, SER-031 | RN03; precondición "catálogo de servicios configurado"; `selección = id_serv + id_prof` |
| SER-032 | Métricas "turnos por servicio" / "por servicio realizado" |
| SER-035 | `servicios_disponibles = 1{id_serv + nom_serv + precio_serv}n` |
