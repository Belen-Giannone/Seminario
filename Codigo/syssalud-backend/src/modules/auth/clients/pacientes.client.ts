import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AltaPerfilPacienteRequest } from '@syssalud/shared-types';

/**
 * Costura REST hacia Pacientes (PAC-013): al autorregistrarse un paciente
 * (CUU01 alt. 2.a) Auth le crea su perfil con `POST /api/pacientes/perfil`,
 * usando el JWT recién emitido. Idempotente del lado de Pacientes.
 * Nunca lanza: si Pacientes no responde, el registro/login sigue y se
 * registra WARN (el perfil se vuelve a intentar en el próximo login).
 */
@Injectable()
export class PacientesClient {
  private readonly logger = new Logger(PacientesClient.name);

  constructor(private readonly config: ConfigService) {}

  async altaPerfil(
    datos: AltaPerfilPacienteRequest,
    accessToken: string,
  ): Promise<boolean> {
    const baseUrl = this.config.get<string>(
      'PACIENTES_API_URL',
      'http://localhost:4000/api',
    );
    try {
      const respuesta = await fetch(`${baseUrl}/pacientes/perfil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(datos),
        signal: AbortSignal.timeout(3000),
      });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `No se pudo crear el perfil de paciente de ${datos.usuarioId}: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      return false;
    }
  }
}
