import { IsDateString, IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class CrearPacienteDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio.' })
  apellido: string;

  @Matches(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos.' })
  dni: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida.' })
  fechaNacimiento: string;

  @IsNotEmpty({ message: 'El teléfono es obligatorio.' })
  telefono: string;

  @IsEmail({}, { message: 'El correo no es válido.' })
  email: string;

  @IsNotEmpty({ message: 'El domicilio es obligatorio.' })
  domicilio: string;
}
