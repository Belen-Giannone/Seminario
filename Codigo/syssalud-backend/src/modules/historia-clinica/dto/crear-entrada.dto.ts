import type { CrearEntradaRequest } from '@syssalud/shared-types';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** HCL-015 / HCL-023: al menos un campo no vacío (lo valida el service). */
export class CrearEntradaDto implements CrearEntradaRequest {
  @IsString()
  @MaxLength(5000)
  observaciones: string;

  @IsString()
  @MaxLength(5000)
  antecedentes: string;

  @IsString()
  @MaxLength(5000)
  tratamientos: string;

  @IsOptional()
  @IsUUID()
  turnoId?: string;
}
