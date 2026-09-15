import { ConsultarAgendaQuery } from '@syssalud/shared-types';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

/**
 * Query de `GET /api/agenda/:profesionalId` y `GET /api/agenda/mi-agenda` (AGE-012/AGE-014).
 * `profesionalId` viaja por parámetro de ruta, no acá.
 */
export class ConsultarAgendaQueryDto implements Omit<
  ConsultarAgendaQuery,
  'profesionalId'
> {
  @IsDateString({}, { message: 'desde debe ser una fecha ISO (YYYY-MM-DD)' })
  desde: string;

  @IsDateString({}, { message: 'hasta debe ser una fecha ISO (YYYY-MM-DD)' })
  hasta: string;

  @IsOptional()
  @IsIn(['dia', 'semana', 'mes'], {
    message: 'periodo debe ser dia, semana o mes',
  })
  periodo?: 'dia' | 'semana' | 'mes';
}
