import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearProfesionalDto {
  @IsUUID()
  usuarioId: string; // debe existir en Usuario con rol PROFESIONAL

  @IsString()
  especialidad: string;

  @IsOptional()
  @IsString()
  matricula?: string;
}
