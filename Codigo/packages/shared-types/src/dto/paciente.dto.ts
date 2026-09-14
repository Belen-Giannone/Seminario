import { EstadoPaciente } from '../enums/paciente.enum';

export interface Paciente {
  id: string;
  numeroPaciente: number;
  estado: EstadoPaciente;
  usuarioId: string | null;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
  fechaAlta: string;
}

export interface PacienteResumen {
  id: string;
  numeroPaciente: number;
  nombreCompleto: string;
  dni: string;
}

export interface CrearPacienteRequest {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
}

export interface AltaPerfilPacienteRequest extends CrearPacienteRequest {
  usuarioId: string;
}

export type ActualizarPacienteRequest = Partial
  Pick<Paciente, 'telefono' | 'email' | 'domicilio' | 'estado'>
>;

export const pacienteResumenFixture: PacienteResumen = {
  id: '11111111-1111-1111-1111-111111111111',
  numeroPaciente: 1,
  nombreCompleto: 'Juana Pérez',
  dni: '30123456',
};