import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CrearEntradaDto {
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
