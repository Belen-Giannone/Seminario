import { DiaSemana, HorarioAtencionInput } from '@syssalud/shared-types';
import { IsEnum, IsMilitaryTime } from 'class-validator';

/** `diaSemana` sólo acepta 1-5 (L-V, RN07) porque el enum ya no define sábado/domingo. */
export class HorarioAtencionInputDto implements HorarioAtencionInput {
  @IsEnum(DiaSemana, { message: 'El día debe ser de lunes a viernes.' })
  diaSemana: DiaSemana;

  @IsMilitaryTime({ message: 'La hora de inicio debe tener el formato HH:mm.' })
  horaInicio: string;

  @IsMilitaryTime({ message: 'La hora de fin debe tener el formato HH:mm.' })
  horaFin: string;
}
