import { Injectable, Logger } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { AuthService, UsuarioResumen } from '../../auth/auth.service';

export type { UsuarioResumen } from '../../auth/auth.service';

export interface CrearUsuarioResponse extends UsuarioResumen {
  passwordInicial?: string;
}

/**
 * Puente hacia Auth. Hoy Auth vive en el mismo proceso Nest (no hay
 * microservicio separado), así que llama directo a AuthService en vez de
 * hacer un pedido HTTP a rutas `/usuarios` que no existen.
 */
@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);

  constructor(private readonly authService: AuthService) {}

  async crearUsuario(datos: {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    telefono: string;
    email: string;
    domicilio: string;
    rol: 'PACIENTE';
  }): Promise<CrearUsuarioResponse | null> {
    try {
      return await this.authService.crearUsuarioInterno({
        ...datos,
        rol: Rol.PACIENTE,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo crear el usuario en Auth: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async obtenerUsuarios(ids: string[]): Promise<UsuarioResumen[]> {
    if (ids.length === 0) return [];
    const encontrados = await this.authService.obtenerResumenesPorIds(ids);
    const porId = new Map(encontrados.map((u) => [u.id, u]));
    return ids.map(
      (id) =>
        porId.get(id) ?? {
          id,
          nombre: '',
          apellido: '',
          dni: '',
          fechaNacimiento: '',
          telefono: '',
          email: '',
          domicilio: '',
        },
    );
  }

  async actualizarContacto(
    usuarioId: string,
    datos: Partial<Pick<UsuarioResumen, 'telefono' | 'email' | 'domicilio'>>,
  ): Promise<boolean> {
    return this.authService.actualizarContactoInterno(usuarioId, datos);
  }
}
