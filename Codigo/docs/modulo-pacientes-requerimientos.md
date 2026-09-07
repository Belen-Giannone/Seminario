# Módulo Pacientes — Requerimientos para el desarrollo completo

**Caso de uso cubierto:** CUU01 — Registrar paciente (camino básico por Asistente; el autorregistro entra por Auth).
**Pareja responsable:** Pareja A (Pacientes & Historia Clínica).
**Estado actual:** esqueleto (`pacientes.module.ts`, `pacientes.controller.ts` con `GET /pacientes` de ping, `pacientes.service.ts` con `estado()`). Sin entidad, DTOs, persistencia, RBAC ni frontend propio.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md`.

## Contexto de negocio

- Actor primario CUU01: Asistente administrativo (ADM). Otros: Paciente (PAC).
- Precondición de sistema: **no debe existir un registro con el mismo DNI**.
- Camino básico: ADM ingresa datos personales del PAC (nombre, apellido, DNI, fecha de nacimiento, teléfono, correo, domicilio) → el sistema valida no-duplicado → asigna **número de paciente** y **genera credenciales** → confirma y **notifica a ADM y PAC**.
- Alternativos: `2.a` autorregistro (lo maneja Auth y continúa acá el alta del perfil); `3.a` paciente ya registrado → informa y no crea. Fin CU.
- Diccionario: `pac = nom_pac + id_pac + dni_pac + fec_nac_pac + tel_pac + email_pac + dom_pac`; `notif_reg_pac = "Paciente registrado. Detalles:" + nom_pac + id_pac`.
- RN06: un paciente no puede solicitar turno si no está registrado (consumido por Turnos).
- Buscador de pacientes por DNI o apellido: lo usan CUU02 (alt 1.a, ADM saca turno para un paciente) y CUU09 (profesional busca la HC).

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Auth | crear/obtener el `Usuario` (credenciales, rol PACIENTE, nombre/email) | `AuthClient` → `POST /api/usuarios`, `GET /api/usuarios/:id` |
| **Saliente** | Notificaciones | `notif_reg_pac` al alta | `NotificacionesClient` → `POST /api/notificaciones` |
| **Entrante** | Turnos, Agenda, Historia Clínica, Métricas | validar registro (RN06), datos del paciente, buscador por DNI/apellido | endpoints que Pacientes expone |

---

## 1. Principios de arquitectura

### PAC-001 — Sin acoplamiento en proceso
Pacientes no importa services/entidades de otros feature modules; usa `AuthClient` y `NotificacionesClient` (HTTP). No exporta su service para inyección cruzada.

### PAC-002 — Costuras REST con degradación elegante
Si Auth no responde al alta, se persiste el `Paciente` con `usuarioId = null` y estado `PENDIENTE_CREDENCIALES`, se loguea `WARN` y se responde `201`. Un job/endpoint de reconciliación completa el vínculo después. Flag `PACIENTES_VALIDAR_AUTH=lenient|strict`.

### PAC-003 — Contratos compartidos
`Paciente`, `PacienteResumen`, `CrearPacienteRequest`, `ActualizarPacienteRequest` en `packages/shared-types` con fixture.

### PAC-004 — Readiness observable
`GET /api/pacientes/_estado` → `{ modulo:'pacientes', dependencias:{ auth, notificaciones }, modoValidacion }`.

### PAC-005 — Actualizar el JSDoc del stub
Reemplazar el `TODO (Pareja A)` que menciona "por inyección ... nunca importando el repository" por la costura REST a Auth.

---

## 2. Modelo de datos y persistencia

### PAC-006 — Entidad `Paciente`
`pacientes`: `id` (uuid), `usuarioId` (uuid, FK lógica a `usuarios` de Auth, nullable mientras PAC-002), `numeroPaciente` (int correlativo, único), `estado` (`ACTIVO` | `PENDIENTE_CREDENCIALES` | `INACTIVO`), `fechaAlta`, `altaPor` (`ADM` | `AUTORREGISTRO`), timestamps.
Los datos personales (nombre, apellido, dni, fecha de nacimiento, teléfono, correo, domicilio) **viven en `Usuario`** (Auth); acá no se duplican, se resuelven por `AuthClient`. Si el equipo prefiere desnormalizar para consultas rápidas, cachear `dni` y `apellido` en `pacientes` con índice (solo para el buscador).

### PAC-007 — Número de paciente
`numeroPaciente` se asigna secuencialmente al alta (secuencia Postgres o `MAX+1` transaccional). Inmutable.

### PAC-008 — Registrar entidad
`TypeOrmModule.forFeature([Paciente])` en el módulo + `Paciente` en `data-source.ts`.

### PAC-009 — Baja lógica
`estado = INACTIVO`; no se borra (turnos e historia clínica lo referencian).

---

## 3. Contratos compartidos (`packages/shared-types`)

### PAC-010 — DTOs de paciente
- `Paciente`: `id`, `numeroPaciente`, `estado`, `usuarioId`, `nombre`, `apellido`, `dni`, `fechaNacimiento`, `telefono`, `email`, `domicilio`, `fechaAlta` (los últimos campos poblados vía Auth).
- `PacienteResumen`: `id`, `numeroPaciente`, `nombreCompleto`, `dni`.
- `CrearPacienteRequest`: `nombre`, `apellido`, `dni`, `fechaNacimiento`, `telefono`, `email`, `domicilio` (mismos campos que `RegisterPacienteRequest` de Auth, sin `password`).
- `ActualizarPacienteRequest`: `Partial` de contacto (`telefono`, `email`, `domicilio`) + `estado?`.

### PAC-011 — Exportar
`export type { ... }` en `src/index.ts` + `pacienteResumenFixture`.

---

## 4. API — endpoints que Pacientes expone

### PAC-012 — `POST /api/pacientes` — alta por Asistente (CUU01 camino básico)
Valida DNI no duplicado (PAC-014). Invoca `AuthClient.crearUsuario({...datos, rol: PACIENTE})` para credenciales; crea `Paciente` con `numeroPaciente`; invoca `NotificacionesClient` (`notif_reg_pac`). Devuelve `201` con `Paciente` + credencial inicial (una vez).
**RBAC:** `@Roles(Rol.ASISTENTE)`.

### PAC-013 — `POST /api/pacientes/perfil` — alta de perfil desde autorregistro
Endpoint que **Auth** llama tras `POST /api/auth/register` (costura inversa): recibe `usuarioId` + datos y crea el `Paciente` (`altaPor = AUTORREGISTRO`). Idempotente por `usuarioId`.
**RBAC:** autenticado (lo llama Auth); rechazar si el `usuarioId` no corresponde a un usuario `PACIENTE`.

### PAC-014 — `GET /api/pacientes` — buscador
`?buscar=<dni|apellido>` (CUU02 alt 1.a, CUU09). Devuelve `PacienteResumen[]`. Sin `buscar`: listado paginado.
**RBAC:** `@Roles(Rol.ASISTENTE, Rol.PROFESIONAL)`.

### PAC-015 — `GET /api/pacientes/:id` — detalle
`Paciente` completo (datos de Auth incluidos, best-effort si Auth cae). `404` si no existe.
**RBAC:** `ASISTENTE`, `PROFESIONAL`, o el propio paciente (`sub` == `usuarioId`).

### PAC-016 — `GET /api/pacientes/por-usuario/:usuarioId` — resolución inversa
Para que Turnos/Historia Clínica pasen del `sub` del JWT al `pacienteId`. `404` si no hay perfil.

### PAC-017 — `PATCH /api/pacientes/:id` — edición
Datos de contacto y `estado`. `ASISTENTE` cualquiera; el propio paciente sólo su contacto (propaga el cambio a Auth vía `AuthClient`).

### PAC-018 — `GET /api/pacientes/:id/registrado` — verificación para RN06
Devuelve `{ registrado: boolean, estado }`. Lo consume Turnos antes de permitir solicitar turno.

### PAC-019 — Reubicar el ping
`GET /api/pacientes` deja de ser el `estado()`; mover a `GET /api/pacientes/_estado` (PAC-004).

---

## 5. Costuras salientes

### PAC-020 — `AuthClient`
`crearUsuario(req): Promise<UsuarioResumen & { passwordInicial?: string }>` → `POST /api/usuarios`; `obtenerUsuarios(ids): Promise<UsuarioResumen[]>` → `GET /api/usuarios?ids=`; `actualizarContacto(id, datos)` → `PATCH /api/usuarios/:id`. Base URL `AUTH_API_URL`. Degradación: PAC-002; para lecturas devuelve `nombreCompleto: null`.

### PAC-021 — `NotificacionesClient`
`enviar(email, mensaje)` → `POST /api/notificaciones`. Plantilla `notif_reg_pac = "Paciente registrado. Detalles:" + nombre + numeroPaciente`. Degradación: log local.

---

## 6. Reglas de negocio y validaciones

### PAC-022 — DNI único (precondición CUU01)
Antes de crear, verificar por DNI (local si se cachea, o vía `AuthClient`). Duplicado → `409` con "Un paciente con este DNI ya se encuentra registrado." (CUU01 `3.a`).

### PAC-023 — Validación de datos personales
`nombre`/`apellido` no vacíos; `dni` `^\d{7,8}$`; `fechaNacimiento` fecha válida y pasada; `email` válido; `telefono` no vacío. Reusar los validadores de `RegisterDto` de Auth para consistencia.

### PAC-024 — Estado y turnos (RN06)
Sólo `estado = ACTIVO` habilita solicitar turno. `PENDIENTE_CREDENCIALES` e `INACTIVO` → `registrado: false` en PAC-018.

---

## 7. Seguridad y control de acceso

### PAC-025 — RBAC por endpoint
Alta/edición administrativa: `@Roles(Rol.ASISTENTE)`. Buscador/detalle: `ASISTENTE` + `PROFESIONAL`. El paciente sólo ve/edita su propio perfil (`sub` == `usuarioId`). `_estado`: sin rol.

---

## 8. Consumidores de Pacientes

### PAC-026 — Vía REST, sin importar el service
Turnos (`GET /api/pacientes/:id/registrado`, `/por-usuario/:usuarioId`), Historia Clínica (`GET /api/pacientes?buscar=`), Agenda y Métricas (`PacienteResumen` para nombres). Cada consumidor con su `PacientesClient` y degradación propia.

---

## 9. Frontend

### PAC-027 — Pantalla "Registro de Nuevo Paciente"
Ya existe parcialmente (flujo de autorregistro). Completar: usable también por el ASISTENTE (`POST /api/pacientes`), con validación de "Registro exitoso" y muestra de credenciales generadas.

### PAC-028 — Buscador / ABM de pacientes (perfil ASISTENTE)
Listado + búsqueda por DNI/apellido, alta, edición de contacto, baja lógica. Enlace en el menú del asistente.

### PAC-029 — Métodos de API
`lib/api.ts`: `pacientes.crear`, `pacientes.buscar`, `pacientes.obtener`, `pacientes.actualizar`.

---

## 10. Datos de prueba y configuración

### PAC-030 — Seed
Crear `Paciente` para `paciente@syssalud.com` (el `Usuario` ya lo crea el seed de Auth): `numeroPaciente = 1`, `estado = ACTIVO`, `altaPor = ADM`. Idempotente por `usuarioId`.

### PAC-031 — Variables de entorno
`AUTH_API_URL`, `NOTIFICACIONES_API_URL`, `PACIENTES_VALIDAR_AUTH` (`lenient`|`strict`). Documentar en `README.md` y `.env` de ejemplo.

---

## 11. Pruebas

### PAC-032 — Unit `PacientesService`
Alta OK asigna `numeroPaciente`; DNI duplicado → `409`; Auth caído en modo `lenient` → `Paciente` `PENDIENTE_CREDENCIALES` + `WARN`; `registrado` refleja el `estado`.

### PAC-033 — Costuras
`AuthClient` / `NotificacionesClient` con HTTP mockeado (OK / `404` / timeout → fallback).

### PAC-034 — Controller / RBAC
PACIENTE no puede listar el buscador (`403`); sí ve su propio `/pacientes/:id`.

### PAC-035 — e2e CUU01
ADM se loguea → alta de paciente → verifica `notif_reg_pac` en la bitácora de Notificaciones → el paciente puede loguearse con la credencial generada.

---

## 12. No funcionales y documentación

### PAC-036 — Errores consistentes
Mensajes del diccionario CUU01 ("Un paciente con este DNI ya se encuentra registrado.", "Paciente registrado. Detalles:").

### PAC-037 — Documentación
`README.md` del backend con `/api/pacientes`; JSDoc referenciando CUU01 / RN06; documentar la doble vía de alta (ADM vs autorregistro) y la costura inversa con Auth.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| PAC-001…PAC-005, PAC-019, PAC-020, PAC-021, PAC-026 | `docs/_comun-arquitectura.md` |
| PAC-006, PAC-010, PAC-023 | `pac = nom_pac + id_pac + dni_pac + fec_nac_pac + tel_pac + email_pac + dom_pac` |
| PAC-007, PAC-012 | CUU01 camino básico paso 4 ("asigna número de paciente y genera credenciales") |
| PAC-013 | CUU01 alt 2.a (autorregistro) |
| PAC-014 | CUU02 alt 1.a, CUU09 (buscador por DNI/apellido) |
| PAC-018, PAC-024 | RN06 |
| PAC-022, PAC-036 | Precondición CUU01 + `3.a` "paciente ya registrado" |
| PAC-021, PAC-035 | `notif_reg_pac` |
