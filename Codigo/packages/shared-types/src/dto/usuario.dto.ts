import { Rol } from '../enums/rol.enum';

/**
 * Perfil de usuario autenticado tal como lo expone el módulo Auth.
 */
export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  dni?: string | null;
  telefono?: string | null;
  domicilio?: string | null;
  fechaNacimiento?: string | null;
}
