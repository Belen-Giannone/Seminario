import { ActualizarProfesionalRequest } from '@syssalud/shared-types';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/** PRO-017: edición y baja lógica (`activo`). */
export class ActualizarProfesionalDto implements ActualizarProfesionalRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  especialidad?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  matricula?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
