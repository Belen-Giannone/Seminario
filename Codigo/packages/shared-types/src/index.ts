// Exports explícitos (no `export *`): así el bundler del frontend (Rollup)
// puede detectar estáticamente los named exports del build CommonJS.
export { Rol } from './enums/rol.enum';
export { EstadoTurno } from './enums/estado-turno.enum';
export { EstadoPago } from './enums/estado-pago.enum';
export { MetodoPago } from './enums/metodo-pago.enum';
export type { UsuarioPerfil } from './dto/usuario.dto';
export type { LoginRequest, RegisterPacienteRequest, AuthResponse } from './dto/auth.dto';
export type { HorarioAtencion } from './dto/horario-atencion.dto';
export type {
  AgendaItem,
  AgendaProfesional,
  SlotDisponible,
  ConsultarAgendaQuery,
  DisponibilidadQuery,
} from './dto/agenda.dto';
export { BLOQUE_AGENDA_MIN } from './constants/agenda.constant';
export { agendaProfesionalFixture } from './fixtures/agenda.fixture';
