# Requerimientos por módulo — SysSalud

Un documento por módulo con los requerimientos para su desarrollo completo, tagueados con un prefijo
propio (`SER-001`, `PAC-001`, …). Todos siguen la misma estructura y la misma decisión de arquitectura:
**módulos independientes con costuras REST cableadas y degradación elegante** (cada módulo funciona
aunque sus dependencias no existan todavía; ver `_comun-arquitectura.md`).

| Módulo | Documento | Tag | CUU | Estado actual |
|---|---|---|---|---|
| Arquitectura común | [_comun-arquitectura.md](_comun-arquitectura.md) | — | — | referencia |
| Auth / IAM | [modulo-auth-requerimientos.md](modulo-auth-requerimientos.md) | `AUT-` | login, autorregistro | **funcional** (consolidar + huecos) |
| Pacientes | [modulo-pacientes-requerimientos.md](modulo-pacientes-requerimientos.md) | `PAC-` | CUU01 | esqueleto |
| Historia Clínica | [modulo-historia-clinica-requerimientos.md](modulo-historia-clinica-requerimientos.md) | `HCL-` | CUU09 | esqueleto |
| Servicios | [modulo-servicios-requerimientos.md](modulo-servicios-requerimientos.md) | `SER-` | CUU10 | esqueleto |
| Profesionales | [modulo-profesionales-requerimientos.md](modulo-profesionales-requerimientos.md) | `PRO-` | soporte | esqueleto |
| Agenda | [modulo-agenda-requerimientos.md](modulo-agenda-requerimientos.md) | `AGE-` | CUU05 | esqueleto |
| Turnos | [modulo-turnos-requerimientos.md](modulo-turnos-requerimientos.md) | `TUR-` | CUU02, CUU03, CUU04 | esqueleto |
| Pagos & Comprobantes | [modulo-pagos-requerimientos.md](modulo-pagos-requerimientos.md) | `PAG-` | CUU06 (+ pago de CUU02) | esqueleto |
| Notificaciones | [modulo-notificaciones-requerimientos.md](modulo-notificaciones-requerimientos.md) | `NOT-` | transversal (RN16, RN18) | parcial (solo log) |
| Métricas de Negocio | [modulo-metricas-negocio-requerimientos.md](modulo-metricas-negocio-requerimientos.md) | `MNE-` | CUU07 | esqueleto |
| Métricas de Desempeño | [modulo-metricas-desempeno-requerimientos.md](modulo-metricas-desempeno-requerimientos.md) | `MDE-` | CUU08 | esqueleto |

## Mapa de costuras REST entre módulos

```
Auth ──(usuarios: nombre/rol)──► [todos]
Pacientes ──► Auth, Notificaciones
Profesionales ──► Auth
Servicios ──► Profesionales
Historia Clínica ──► Pacientes, Turnos
Agenda ──► Profesionales, Turnos, Servicios, Feriados
Turnos ──► Pacientes, Servicios, Profesionales, Agenda, Pagos, Notificaciones
Pagos ──► Turnos, Notificaciones, Pasarela(mock)
Métricas Negocio ──► Turnos, Pagos, Servicios, Profesionales, Mercado
Métricas Desempeño ──► Turnos, Servicios, Profesionales
Notificaciones ──► (nada de negocio; sólo CanalEnvio)
```

Cada flecha `A ──► B` es un cliente HTTP `BClient` dentro de `A`, contra el endpoint REST público de `B`,
con base URL por variable de entorno, fallback documentado + log `WARN`, y un flag
`A_VALIDAR_B=lenient|strict`. Cuando `B` esté listo: se apunta la URL y se pasa a `strict`, sin cambios de código.

## Convención de cada documento

1. Estrategia / dependencias del módulo (tabla de costuras entrante/saliente)
2. Contexto de negocio (CUU + RN + diccionario de datos del PDF)
3. §1 Principios de arquitectura · §2 Modelo de datos · §3 Contratos compartidos
4. §4 API que expone · §5 Costuras salientes · §6 Reglas de negocio · §7 RBAC
5. §8 Consumidores · §9 Frontend · §10 Config · §11 Pruebas · §12 No funcionales
6. Matriz de trazabilidad (requerimiento → origen en el PDF)

## Nota sobre los TODO de los stubs

Varios `*.service.ts` de la rama actual sugieren comunicación **por inyección de dependencias** entre
módulos ("inyectar XService", "nunca HTTP interno"). Esa guía queda reemplazada por la decisión vigente
(costuras REST). Actualizar esos JSDoc figura como requerimiento en cada documento.
