import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDivisibleBy,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BLOQUE_AGENDA_MIN,
  type ActualizarServicioRequest,
} from '@syssalud/shared-types';
import { DURACION_MAX_MIN, recortar } from './crear-servicio.dto';

/**
 * Modificación parcial (SER-018): `1.a` nombre/descripción, reasignar
 * profesionales, `4.a` sólo precio, o reactivar con `activo: true`.
 * Mismas reglas que el alta para cada campo presente.
 */
export class ActualizarServicioDto implements ActualizarServicioRequest {
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede quedar vacío.' })
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'La descripción no puede quedar vacía.' })
  @MaxLength(2000)
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos.' })
  @Min(BLOQUE_AGENDA_MIN, {
    message: `La duración mínima es ${BLOQUE_AGENDA_MIN} minutos.`,
  })
  @Max(DURACION_MAX_MIN, {
    message: `La duración máxima es ${DURACION_MAX_MIN} minutos.`,
  })
  @IsDivisibleBy(BLOQUE_AGENDA_MIN, {
    message: `La duración debe ser múltiplo de ${BLOQUE_AGENDA_MIN} minutos.`,
  })
  duracionMin?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe tener como máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  precio?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe asociar al menos un profesional.' })
  @ArrayUnique()
  @IsUUID('all', {
    each: true,
    message: 'Cada profesional debe ser un UUID válido.',
  })
  profesionalIds?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
