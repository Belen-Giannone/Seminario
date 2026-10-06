import { IsDateString, IsOptional, IsUUID, Matches } from 'class-validator';

export class SolicitarTurnoDto {
  @IsUUID(undefined, { message: 'El servicio indicado no es válido.' })
  servicioId: string;

  @IsUUID(undefined, { message: 'El profesional indicado no es válido.' })
  profesionalId: string;

  @IsDateString({}, { message: 'La fecha no es válida.' })
  fecha: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora debe tener el formato HH:mm.',
  })
  hora: string;

  /** Obligatorio cuando solicita la ASISTENTE (CUU02 alt 1.a); se ignora si lo pide el PACIENTE. */
  @IsOptional()
  @IsUUID(undefined, { message: 'El paciente indicado no es válido.' })
  pacienteId?: string;
}
