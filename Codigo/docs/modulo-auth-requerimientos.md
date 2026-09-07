# Módulo Auth / IAM — Requerimientos para el desarrollo completo

**Cubre:** Login unificado (RN04, RN05), autorregistro de paciente (CUU01 camino alternativo 2.a), emisión y validación de JWT para todo el sistema, alta administrativa de usuarios.
**Pareja responsable:** Módulo 0 (transversal).
**Estado actual:** **funcional**. Entidad `Usuario`, endpoints `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `JwtAuthGuard` + `RolesGuard` + `@Roles`, `bcryptjs`, `@nestjs/jwt`, specs de service y controller, seed de un usuario demo por rol.
**Referencia de arquitectura:** `docs/_comun-arquitectura.md` (costuras REST, degradación, convenciones).

## Contexto de negocio

- RN01: roles `PACIENTE`, `ASISTENTE`, `PROFESIONAL`, `DUENO`.
- RN04: sólo acceden usuarios previamente registrados. RN05: login exige credenciales válidas.
- CUU01: el registro público sólo da de alta **pacientes**; el resto de los roles se crean administrativamente.
- Diccionario CUU01: `pac = nom_pac + id_pac + dni_pac + fec_nac_pac + tel_pac + email_pac + dom_pac`; `credenciales_acceso = usuario + password`.
- Auth es dependencia entrante de **todos** los módulos: validan el JWT con el guard compartido y resuelven nombres de usuario por su id.

## Dependencias del módulo

| Dirección | Contraparte | Necesita | Costura |
|---|---|---|---|
| **Saliente** | Pacientes | crear el perfil de negocio `Paciente` cuando alguien se autorregistra | `PacientesClient` → `POST /api/pacientes` |
| **Saliente** | Notificaciones | `notif_reg_pac` al alta de usuario | `NotificacionesClient` → `POST /api/notificaciones` |
| **Entrante** | Todos | validar JWT; resumen de usuario por id (nombre, apellido, rol, email) | endpoints que Auth expone |

---

## 1. Principios de arquitectura

### AUT-001 — Sin acoplamiento en proceso
Auth no importa services ni entidades de otros feature modules. Las dependencias salientes se resuelven por `PacientesClient` / `NotificacionesClient` (HTTP). `JwtAuthGuard`/`RolesGuard` siguen siendo compartidos vía `src/shared` (infra, no feature).

### AUT-002 — Costuras REST con degradación elegante
Si Pacientes o Notificaciones no responden, `POST /api/auth/register` **igual crea el `Usuario`** y responde `201`; loguea `WARN` y deja el perfil de paciente / la notificación como pendiente. Flag `AUTH_VALIDAR_PACIENTES=lenient|strict`.

### AUT-003 — Contratos compartidos
`ProfesionalResumen`/`UsuarioResumen` y los request de las costuras se declaran en `packages/shared-types` con fixture de ejemplo.

### AUT-004 — Readiness observable
`GET /api/auth/_estado` → `{ modulo:'auth', dependencias:{ pacientes, notificaciones }, modoValidacion }`.

### AUT-005 — Configuración por entorno, sin secretos hardcodeados
`JWT_SECRET` y `JWT_EXPIRES_IN` **obligatorios** por entorno; eliminar el fallback `'super_clave_secreta_syssalud_2026'` de `jwt-auth.guard.ts` y `auth.service.ts` (que la app no arranque sin secret en producción).

---

## 2. Modelo de datos

### AUT-006 — Consolidar la entidad `Usuario` (ya existe)
`usuarios`: `id` (uuid), `email` (único), `passwordHash`, `nombre`, `apellido`, `dni` (único nullable), `rol` (enum), `telefono`, `domicilio`, `fechaNacimiento`, timestamps. **Mantener** como está.
**Aceptación:** sin cambios de esquema salvo AUT-007.

### AUT-007 — Estado de cuenta
Agregar `activo: boolean` (default `true`) para poder deshabilitar accesos (baja de personal) sin borrar el usuario. El login rechaza usuarios `activo=false` con `401`.

### AUT-008 — Auditoría mínima
`ultimoLoginEn: Date | null` actualizado en cada login exitoso (insumo de soporte y de métricas de uso).

---

## 3. Contratos compartidos (`packages/shared-types`)

### AUT-009 — `UsuarioResumen` y `CrearUsuarioRequest`
- `UsuarioResumen`: `id`, `nombreCompleto`, `email`, `rol`, `activo`. Es lo que consumen Pacientes, Profesionales, Agenda, Turnos, Métricas para mostrar nombres.
- `CrearUsuarioRequest`: `nombre`, `apellido`, `email`, `dni?`, `rol`, `telefono?`, `domicilio?`, `fechaNacimiento?`, `passwordInicial?`.
- Exportar en `src/index.ts` + fixture `usuarioResumenFixture`.

---

## 4. API — endpoints que Auth expone

### AUT-010 — `POST /api/auth/login` (existe) — consolidar
Devuelve `AuthResponse` (`accessToken` + `usuario`). Agregar rechazo por `activo=false` (AUT-007) y actualización de `ultimoLoginEn` (AUT-008).

### AUT-011 — `POST /api/auth/register` (existe) — autorregistro de paciente
CUU01 alt 2.a: crea `Usuario` con `rol=PACIENTE`. **Nuevo:** tras crear el usuario, invocar `PacientesClient.crearPerfil(...)` (AUT-002) para el perfil de negocio; degradar si Pacientes no está.

### AUT-012 — `GET /api/auth/me` (existe) — consolidar
Perfil del usuario autenticado a partir del token. Sin cambios funcionales; agregar `activo` al payload.

### AUT-013 — `POST /api/usuarios` — alta administrativa
Crea usuarios de cualquier rol (`ASISTENTE`, `PROFESIONAL`, `DUENO`, o `PACIENTE` dado de alta por mostrador — CUU01 camino básico). Genera contraseña inicial si no se envía. `@Roles(Rol.ASISTENTE, Rol.DUENO)`.
**Aceptación:** `409` si el email o DNI ya existen; devuelve `UsuarioResumen` + credencial inicial una sola vez.

### AUT-014 — `GET /api/usuarios` — listado / resumen por ids
`GET /api/usuarios?ids=a,b,c` y `GET /api/usuarios?rol=PROFESIONAL`. Devuelve `UsuarioResumen[]`. Es la costura entrante que usan Profesionales/Pacientes/Métricas para resolver nombres.
**RBAC:** autenticado; el detalle sensible (dni, domicilio) sólo para `ASISTENTE`/`DUENO` o el propio usuario.

### AUT-015 — `GET /api/usuarios/:id` — detalle
`UsuarioResumen` (+ datos de contacto según RBAC de AUT-014). `404` si no existe.

### AUT-016 — `PATCH /api/usuarios/:id` — edición y baja lógica
Editar datos de contacto y `activo`. El propio usuario puede editar su contacto; `ASISTENTE`/`DUENO` cualquiera. Cambiar rol: sólo `DUENO`.

### AUT-017 — `POST /api/auth/cambiar-password`
Cambio de contraseña del usuario autenticado (password actual + nueva, `MinLength(8)`).

### AUT-018 — Reubicar el `GET /api/auth` de estado
Hoy no hay ping; agregar `GET /api/auth/_estado` (AUT-004). No exponer un listado en la raíz sin auth.

---

## 5. Costuras salientes

### AUT-019 — `PacientesClient`
`auth/clients/pacientes.client.ts`. `crearPerfil(usuarioId, datosPac): Promise<void>` → `POST /api/pacientes`. Base URL `PACIENTES_API_URL` (default `http://localhost:4000/api`). Degradación: log `WARN "Pacientes API no disponible: perfil de paciente pendiente para <usuarioId>"`, sin romper el registro. Stub para tests.

### AUT-020 — `NotificacionesClient`
`enviar(destinatarioEmail, mensaje)` → `POST /api/notificaciones`. Plantilla `notif_reg_pac` = `"Paciente registrado. Detalles:" + nombre + id`. Degradación: log local.

---

## 6. Reglas de negocio y seguridad

### AUT-021 — Registro público sólo pacientes
`POST /api/auth/register` fuerza `rol=PACIENTE` ignorando cualquier `rol` del body (ya se cumple; dejarlo cubierto por test).

### AUT-022 — Unicidad de email y DNI
`409 Conflict` con mensaje claro (ya implementado en `register`; replicar en `POST /api/usuarios`).

### AUT-023 — Política de contraseña
`MinLength(8)` en registro, alta administrativa y cambio de contraseña. Hash `bcrypt` coste ≥ 10 (ya).

### AUT-024 — Expiración y validación de token
`JWT_EXPIRES_IN` configurable (p. ej. `8h`). El guard devuelve `401` "Token inválido o expirado" (ya). Documentar que no hay refresh token en el alcance del TP.

### AUT-025 — RBAC de gestión de usuarios
`POST/PATCH /api/usuarios`: `@Roles(Rol.ASISTENTE, Rol.DUENO)`; cambio de rol sólo `DUENO`; `GET` autenticado con filtrado de campos sensibles.

---

## 7. Consumidores de Auth (todos los módulos)

### AUT-026 — Guard compartido, no import de `AuthService`
Los demás módulos validan el JWT con `JwtAuthGuard` (infra `shared/`), nunca importando `AuthService`. Para resolver nombres usan `AuthClient` propio contra `GET /api/usuarios?ids=`.

### AUT-027 — `sub` del token como identidad
El `sub` (uuid del usuario) es la identidad que Turnos/Historia Clínica/Métricas usan para filtrar "lo propio" (RN10, RN15). Documentado en el contrato del payload (`sub`, `email`, `rol`, `nombre`).

---

## 8. Frontend

### AUT-028 — Pantallas existentes
`LoginPage` y `RegisterPage` ya consumen `api.login/register/me` y `auth-context`. Mantener; agregar manejo de `401` por cuenta inhabilitada.

### AUT-029 — Alta y administración de usuarios
Pantalla para `ASISTENTE`/`DUENO`: listado de usuarios (`GET /api/usuarios`), alta (`POST /api/usuarios`), edición y baja lógica. Muestra la credencial inicial generada una sola vez.

### AUT-030 — Cambio de contraseña
Formulario en el perfil del usuario autenticado (`POST /api/auth/cambiar-password`).

### AUT-031 — Métodos de API
Agregar a `lib/api.ts`: `usuarios.listar`, `usuarios.crear`, `usuarios.obtener`, `usuarios.actualizar`, `auth.cambiarPassword`.

---

## 9. Datos de prueba y configuración

### AUT-032 — Seed (existe) — extender
Mantener los 4 usuarios demo (uno por rol, `Syssalud2026!`). Marcar todos `activo=true` y, para el paciente demo, disparar/crear también su perfil `Paciente` (coordinar con PAC-*).

### AUT-033 — Variables de entorno
`JWT_SECRET` (obligatoria), `JWT_EXPIRES_IN` (default `8h`), `PACIENTES_API_URL`, `NOTIFICACIONES_API_URL`, `AUTH_VALIDAR_PACIENTES` (`lenient`|`strict`). Documentar en `README.md` del backend y `.env` de ejemplo.

---

## 10. Pruebas

### AUT-034 — Unit / controller (existen) — ampliar
Cubrir: login con cuenta inhabilitada → `401`; `POST /api/usuarios` duplicado → `409`; `register` fuerza `PACIENTE`; RBAC de `/api/usuarios` (PACIENTE → `403`).

### AUT-035 — Costuras
Tests de `PacientesClient` / `NotificacionesClient` con HTTP mockeado: OK, `404`, ECONNREFUSED → fallback + `WARN`, sin excepción propagada.

### AUT-036 — e2e IAM
Registro → login → `me` → cambio de contraseña → login con la nueva → alta administrativa de un profesional por el dueño.

---

## 11. No funcionales y documentación

### AUT-037 — Errores consistentes
Mensajes en español, formato compatible con `extraerMensaje` del cliente. No filtrar en el `401` si el fallo fue por email inexistente o password incoralido ("Credenciales inválidas" genérico — ya se cumple).

### AUT-038 — Documentación
Actualizar `README.md` del backend con `/api/auth` y `/api/usuarios`; documentar el payload del JWT y la ausencia de refresh token; JSDoc en `AuthClient` y en las costuras.

---

## Matriz de trazabilidad

| Requerimiento | Origen |
|---|---|
| AUT-001…AUT-005, AUT-018, AUT-019, AUT-020, AUT-026 | `docs/_comun-arquitectura.md` (módulos independientes + costuras REST) |
| AUT-006, AUT-009…AUT-015, AUT-021, AUT-022 | CUU01; `pac = nom_pac + id_pac + dni_pac + ...`; "el resto de los roles se crean administrativamente" |
| AUT-010, AUT-012, AUT-024, AUT-027 | RN04, RN05; login unificado para los 4 roles |
| AUT-007, AUT-016, AUT-025 | RN01; baja de personal |
| AUT-011 | CUU01 camino alternativo 2.a (autorregistro) |
| AUT-023, AUT-017, AUT-030 | RN05; política de credenciales |
| AUT-014, AUT-015 | costura entrante para resolver `nom_prof` / `nom_pac` en agenda, comprobantes y métricas |
