import { CrearProfesionalRequest } from '@syssalud/shared-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { HorarioAtencionInputDto } from './horario-atencion-input.dto';

/** PRO-012: alta en un paso (crea el `Usuario` en Auth + el `Profesional`). */
export class CrearProfesionalDto implements CrearProfesionalRequest {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  apellido: string;

  @IsEmail({}, { message: 'El email no es válido.' })
  email: string;

  @IsOptional()
  @Matches(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos.' })
  dni?: string;

  @IsString()
  @IsNotEmpty({ message: 'La especialidad es obligatoria.' })
  especialidad: string;

  @IsString()
  @IsNotEmpty({ message: 'La matrícula es obligatoria.' })
  matricula: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioAtencionInputDto)
  horarios?: HorarioAtencionInputDto[];
}
