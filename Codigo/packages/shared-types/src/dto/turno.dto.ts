import { EstadoTurno } from '../enums/estado-turno.enum';
import { MetodoPago } from '../enums/metodo-pago.enum';

export interface Turno {
  id: string;
  pacienteId: string;
  profesionalId: string;
  servicioId: string;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
  monto: number;
  pagoId: string | null;
  comprobanteNumero: string | null;
  reservaExpiraEn: string | null;
  motivoCancelacion: string | null;
  origen: 'PACIENTE' | 'ASISTENTE';
  /** Best-effort: puede venir vacío si la costura de origen degrada. */
  pacienteNombre?: string;
  profesionalNombre?: string;
  servicioNombre?: string;
}

/** Para `turnos_vigentes`: la vista resumida que consumen los listados. */
export interface TurnoResumen {
  idTurno: string;
  fecha: string;
  hora: string;
  estado: EstadoTurno;
  /** Presentes en `GET /api/turnos` (los consume Agenda para armar CUU05). */
  pacienteId?: string;
  servicioId?: string;
}

export interface SolicitarTurnoRequest {
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  /** Obligatorio si lo solicita la ASISTENTE; si lo pide el PACIENTE se toma del `sub`. */
  pacienteId?: string;
}

/** Respuesta del paso 4 de CUU02: monto a pagar antes de confirmar. */
export interface LiquidacionPago {
  pacienteId: string;
  servicioId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  monto: number;
}

export interface PagarTurnoRequest {
  metodoPago: MetodoPago;
  idTransaccion: string;
}

export interface ReprogramarTurnoRequest {
  fecha: string;
  hora: string;
}

export const turnoFixture: Turno = {
  id: '22222222-2222-2222-2222-222222222222',
  pacienteId: '11111111-1111-1111-1111-111111111111',
  profesionalId: '33333333-3333-3333-3333-333333333333',
  servicioId: '44444444-4444-4444-4444-444444444444',
  fecha: '2026-11-10',
  hora: '10:00',
  estado: EstadoTurno.CONFIRMADO,
  monto: 5000,
  pagoId: '55555555-5555-5555-5555-555555555555',
  comprobanteNumero: 'CMP-0001',
  reservaExpiraEn: null,
  motivoCancelacion: null,
  origen: 'PACIENTE',
};

export const liquidacionPagoFixture: LiquidacionPago = {
  pacienteId: turnoFixture.pacienteId,
  servicioId: turnoFixture.servicioId,
  profesionalId: turnoFixture.profesionalId,
  fecha: turnoFixture.fecha,
  hora: turnoFixture.hora,
  monto: turnoFixture.monto,
};
