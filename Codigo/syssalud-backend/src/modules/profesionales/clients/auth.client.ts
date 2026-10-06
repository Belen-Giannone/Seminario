import { Injectable, Logger } from '@nestjs/common';
import { Rol, UsuarioPerfil } from '@syssalud/shared-types';
import { AuthService } from '../../auth/auth.service';

export interface CrearUsuarioResponse extends UsuarioPerfil {
  passwordInicial: string;
}

/**
 * Costura hacia Auth (PRO-020). Auth vive en el mismo proceso Nest, así que
 * se llama directo a `AuthService` en vez de a una ruta HTTP `/usuarios` que
 * no existe (mismo criterio que `pacientes/clients/auth.client.ts`).
 */
@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);

  constructor(private readonly authService: AuthService) {}

  /** `null` si Auth rechaza el alta (p. ej. email/DNI duplicado) — degradación PRO-002. */
  async crearUsuario(datos: {
    nombre: string;
    apellido: string;
    email: string;
    dni?: string;
  }): Promise<CrearUsuarioResponse | null> {
    try {
      return await this.authService.crearUsuarioInterno({
        ...datos,
        rol: Rol.PROFESIONAL,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo crear el usuario en Auth: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async obtenerUsuarios(ids: string[]): Promise<UsuarioPerfil[]> {
    if (ids.length === 0) return [];
    try {
      return await this.authService.obtenerResumenesPorIds(ids);
    } catch (error) {
      this.logger.warn(
        `No se pudieron resolver los usuarios (PRO-002): ${(error as Error).message}`,
      );
      return [];
    }
  }
}
