import { DisponibilidadQuery } from '@syssalud/shared-types';
import { IsDateString, IsUUID } from 'class-validator';

/** Query de `GET /api/agenda/:profesionalId/disponibilidad` (AGE-013). */
export class DisponibilidadQueryDto implements Omit<
  DisponibilidadQuery,
  'profesionalId'
> {
  @IsUUID('4', { message: 'servicioId debe ser un UUID válido' })
  servicioId: string;

  @IsDateString({}, { message: 'desde debe ser una fecha ISO (YYYY-MM-DD)' })
  desde: string;

  @IsDateString({}, { message: 'hasta debe ser una fecha ISO (YYYY-MM-DD)' })
  hasta: string;
}
