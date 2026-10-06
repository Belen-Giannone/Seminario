import { IsDateString, Matches } from 'class-validator';

export class ReprogramarTurnoDto {
  @IsDateString({}, { message: 'La fecha no es válida.' })
  fecha: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora debe tener el formato HH:mm.',
  })
  hora: string;
}
