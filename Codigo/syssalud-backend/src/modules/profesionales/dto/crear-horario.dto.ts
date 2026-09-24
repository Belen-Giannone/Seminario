import { DiaSemana } from '@syssalud/shared-types';
import { IsEnum, IsMilitaryTime } from 'class-validator';

export class CrearHorarioDto {
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  @IsMilitaryTime()
  horaInicio: string; // formato HH:MM

  @IsMilitaryTime()
  horaFin: string;
}
