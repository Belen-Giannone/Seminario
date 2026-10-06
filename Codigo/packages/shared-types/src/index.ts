// Exports explícitos (no `export *`): así el bundler del frontend (Rollup)
// puede detectar estáticamente los named exports del build CommonJS.
export { Rol } from './enums/rol.enum';
export { EstadoTurno } from './enums/estado-turno.enum';
export { EstadoPago } from './enums/estado-pago.enum';
export { MetodoPago } from './enums/metodo-pago.enum';
export { DiaSemana } from './enums/dia-semana.enum';
export { EstadoPaciente, AltaPor } from './enums/paciente.enum';
export type { UsuarioPerfil } from './dto/usuario.dto';
export type { LoginRequest, RegisterPacienteRequest, AuthResponse } from './dto/auth.dto';
export type {
  Profesional,
  ProfesionalResumen,
  CrearProfesionalRequest,
  ActualizarProfesionalRequest,
  DefinirHorariosRequest,
  HorarioAtencion,
  HorarioAtencionInput,
} from './dto/profesional.dto';
export { profesionalResumenFixture } from './dto/profesional.dto';
export type {
  Paciente,
  PacienteResumen,
  CrearPacienteRequest,
  AltaPerfilPacienteRequest,
  ActualizarPacienteRequest,
} from './dto/paciente.dto';
export { pacienteResumenFixture } from './dto/paciente.dto';
export type {
  AutorEntradaClinica,
  BuscarHistoriaQuery,
  CrearEntradaRequest,
  EntradaClinica,
  EntradaCreadaResponse,
  HistoriaClinica,
  HistoriaClinicaInexistente,
  ResultadoBusquedaHistoria,
} from './dto/historia-clinica.dto';
export { historiaClinicaFixture } from './dto/historia-clinica.dto';
export type {
  Turno,
  TurnoResumen,
  SolicitarTurnoRequest,
  LiquidacionPago,
  PagarTurnoRequest,
  ReprogramarTurnoRequest,
} from './dto/turno.dto';
export { turnoFixture, liquidacionPagoFixture } from './dto/turno.dto';
export type {
  AgendaItem,
  AgendaProfesional,
  SlotDisponible,
  ConsultarAgendaQuery,
  DisponibilidadQuery,
} from './dto/agenda.dto';
export { BLOQUE_AGENDA_MIN } from './constants/agenda.constant';
export { agendaProfesionalFixture } from './fixtures/agenda.fixture';
