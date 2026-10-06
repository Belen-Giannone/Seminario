import { DefinirHorariosRequest } from '@syssalud/shared-types';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { HorarioAtencionInputDto } from './horario-atencion-input.dto';

/** PRO-016: reemplaza el set completo de horarios del profesional. */
export class DefinirHorariosDto implements DefinirHorariosRequest {
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe indicar al menos una franja horaria.' })
  @ValidateNested({ each: true })
  @Type(() => HorarioAtencionInputDto)
  horarios: HorarioAtencionInputDto[];
}
