import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoPaciente } from '@syssalud/shared-types';

export class ActualizarPacienteDto {
  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido.' })
  email?: string;

  @IsOptional()
  @IsString()
  domicilio?: string;

  @IsOptional()
  @IsEnum(EstadoPaciente)
  estado?: EstadoPaciente;
}
