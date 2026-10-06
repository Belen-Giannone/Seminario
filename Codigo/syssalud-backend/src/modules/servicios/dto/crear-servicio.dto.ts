import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDivisibleBy,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  BLOQUE_AGENDA_MIN,
  type CrearServicioRequest,
} from '@syssalud/shared-types';

/** Duración máxima razonable de un servicio (SER-026). */
export const DURACION_MAX_MIN = 480;

export const recortar = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Alta de servicio — CUU10 camino básico (SER-013).
 * SER-026: duración múltiplo del bloque de agenda · SER-027: al menos un
 * profesional · SER-028: precio no negativo con 2 decimales.
 */
export class CrearServicioDto implements CrearServicioRequest {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  @MaxLength(200)
  nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria.' })
  @MaxLength(2000)
  descripcion: string;

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
  duracionMin: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio debe tener como máximo 2 decimales.' },
  )
  @Min(0, { message: 'El precio no puede ser negativo.' })
  precio: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debe asociar al menos un profesional.' })
  @ArrayUnique()
  @IsUUID('all', {
    each: true,
    message: 'Cada profesional debe ser un UUID válido.',
  })
  profesionalIds: string[];
}
