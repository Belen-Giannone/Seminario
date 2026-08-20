import { RegisterPacienteRequest } from '@syssalud/shared-types';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/**
 * CUU01 - Registrar paciente (autorregistro, camino alternativo 2.a).
 * El registro público solo da de alta pacientes: el resto de los roles
 * (asistente, profesional, dueño) se crean administrativamente.
 */
export class RegisterDto implements RegisterPacienteRequest {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  @Matches(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos' })
  dni: string;

  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida (AAAA-MM-DD)' })
  fechaNacimiento: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  telefono: string;

  @IsString()
  @IsNotEmpty({ message: 'El domicilio es obligatorio' })
  domicilio: string;

  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
