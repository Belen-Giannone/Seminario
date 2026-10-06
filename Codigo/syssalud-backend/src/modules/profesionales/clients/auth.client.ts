import { Injectable, Logger } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { AuthService, UsuarioResumen } from '../../auth/auth.service';

export type { UsuarioResumen } from '../../auth/auth.service';

export interface CrearUsuarioResponse extends UsuarioResumen {
  passwordInicial: string;
}

/**
 * Costura hacia Auth (PRO-020). Auth vive en el mismo proceso Nest, así que
 * se llama directo a `AuthService` en vez de a una ruta HTTP `/usuarios` que
 * no existe (mismo criterio que `pacientes/clients/auth.client.ts`).
 *
 * `crearUsuarioInterno` pide `dni`/`fechaNacimiento`/`telefono`/`domicilio`
 * porque ese es el contrato que ya usa Pacientes — Profesionales no los
 * recolecta en su alta, así que viajan vacíos (`Usuario` los tiene nullable).
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
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        dni: datos.dni,
        rol: Rol.PROFESIONAL,
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
