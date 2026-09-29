import { IsString, IsNotEmpty, IsInt, IsPositive, IsNumber, Min, IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';
import { CrearServicioRequest } from '@syssalud/shared-types';
import { AGENDA_BLOQUE_MINUTOS } from '@syssalud/shared-types';

/**
 * DTO para crear servicio con validaciones class-validator
 *
 * SER-013: Reglas de validación detalladas
 * SER-026: Duración múltiplo de bloques de agenda
 * SER-027: Al menos un profesional
 * SER-028: Precio no negativo
 */
export class CrearServicioDto implements CrearServicioRequest {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsInt()
  @IsPositive()
  @Min(AGENDA_BLOQUE_MINUTOS)
  duracionMin: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  profesionalIds: string[];
}