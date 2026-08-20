import { LoginRequest } from '@syssalud/shared-types';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Objeto de Transferencia de Datos (DTO) para la autenticación de usuarios.
 * Define la estructura y reglas de validación necesarias para iniciar sesión.
 */
export class LoginDto implements LoginRequest {
  /**
   * Correo electrónico registrado del usuario.
   * Debe cumplir con un formato de email válido.
   * @example "admin@syssalud.com"
   */
  @IsEmail({}, { message: 'El formato del email no es válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  /**
   * Contraseña de acceso del usuario en texto plano.
   * Requiere una longitud mínima de 6 caracteres para pasar la validación inicial.
   * @example "123456"
   */
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}