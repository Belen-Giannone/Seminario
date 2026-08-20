import { UsuarioPerfil } from './usuario.dto';

/** CUU: Login (RN04, RN05) */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * CUU01 - Registrar paciente, camino alternativo 2.a (autorregistro).
 * Los campos coinciden con el diccionario de datos de CUU01: pac = nom_pac + dni_pac + ...
 */
export interface RegisterPacienteRequest {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string; // ISO 8601 (yyyy-mm-dd)
  telefono: string;
  domicilio: string;
  email: string;
  password: string;
}

/** Respuesta común de /auth/login y /auth/register */
export interface AuthResponse {
  accessToken: string;
  usuario: UsuarioPerfil;
}
