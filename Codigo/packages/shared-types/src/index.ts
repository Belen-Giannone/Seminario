// Exports explícitos (no `export *`): así el bundler del frontend (Rollup)
// puede detectar estáticamente los named exports del build CommonJS.
export { Rol } from './enums/rol.enum';
export { EstadoTurno } from './enums/estado-turno.enum';
export { EstadoPago } from './enums/estado-pago.enum';
export { MetodoPago } from './enums/metodo-pago.enum';
export type { UsuarioPerfil } from './dto/usuario.dto';
export type { LoginRequest, RegisterPacienteRequest, AuthResponse } from './dto/auth.dto';

export {
  Servicio,
  ServicioResumen,
  CrearServicioRequest,
  ActualizarServicioRequest,
  ProfesionalResumen,
} from './dto/servicio.dto';

export {
  profesionalResumenFixture,
} from './dto/profesionales-contract.dto';

export const AGENDA_BLOQUE_MINUTOS = 15; // SER-026: constante compartida