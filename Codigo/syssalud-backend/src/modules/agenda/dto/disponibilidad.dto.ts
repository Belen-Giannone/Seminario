import { DisponibilidadQuery } from '@syssalud/shared-types';
import { IsDateString, IsUUID, ValidateIf } from 'class-validator';

/**
 * Query de `GET /api/agenda/:profesionalId/disponibilidad` (AGE-013).
 * Acepta un rango (`desde` + `hasta`) o un solo día (`fecha`), que es como la
 * consulta Turnos al reservar/reprogramar (TUR-025).
 */
export class DisponibilidadQueryDto implements Omit<
  DisponibilidadQuery,
  'profesionalId' | 'desde' | 'hasta'
> {
  @IsUUID('all', { message: 'servicioId debe ser un UUID válido' })
  servicioId: string;

  @ValidateIf((q: DisponibilidadQueryDto) => !q.fecha)
  @IsDateString({}, { message: 'desde debe ser una fecha ISO (YYYY-MM-DD)' })
  desde?: string;

  @ValidateIf((q: DisponibilidadQueryDto) => !q.fecha)
  @IsDateString({}, { message: 'hasta debe ser una fecha ISO (YYYY-MM-DD)' })
  hasta?: string;

  @ValidateIf((q: DisponibilidadQueryDto) => !q.desde && !q.hasta)
  @IsDateString({}, { message: 'fecha debe ser una fecha ISO (YYYY-MM-DD)' })
  fecha?: string;
}
