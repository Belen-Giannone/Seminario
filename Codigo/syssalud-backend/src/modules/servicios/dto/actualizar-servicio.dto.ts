import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsInt, IsPositive, IsNumber, Min, IsBoolean, IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { ActualizarServicioRequest } from '@syssalud/shared-types';
import { CrearServicioDto } from './crear-servicio.dto';

/**
 * DTO para actualizar servicio (parcial)
 *
 * SER-018: Soporta modificación de campos individuales
 * SER-014.a: Modificar nombre/descripción
 * SER-018.4.a: Modificar precio únicamente
 */
export class ActualizarServicioDto implements ActualizarServicioRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(15)
  duracionMin?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  profesionalIds?: string[];

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}