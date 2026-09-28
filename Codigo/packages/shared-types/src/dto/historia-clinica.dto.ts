export interface PacienteResumen {
  id: string;
  nombre?: string;
  apellido?: string;
  nombreCompleto?: string;
  dni?: string | null;
}

export interface ProfesionalResumen {
  id: string;
  nombre: string;
  apellido: string;
}

export interface EntradaClinica {
  id: string;
  idTurno: string | null; // Unificado idTurno
  fecha: string;
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  fechaActualizacion: string;
  autor: ProfesionalResumen | null;
}

export interface HistoriaClinica {
  idHistoria: string;
  pacienteId: string;
  nomAppPac: string | null;
  telefono: string | null;
  correo: string | null;
  entradas: EntradaClinica[];
}

export interface HistoriaClinicaInexistente {
  existe: false;
  pacienteId: string;
}

export interface CrearEntradaRequest {
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  turnoId?: string;
}

export interface BuscarHistoriaQuery {
  dni?: string;
  nombre?: string;
  apellido?: string;
}

export const historiaClinicaFixture: HistoriaClinica = {
  idHistoria: 'historia-demo',
  pacienteId: 'paciente-demo',
  nomAppPac: 'Dolores Campos',
  telefono: '3411234567',
  correo: 'dolores@syssalud.com',
  entradas: [],
};
