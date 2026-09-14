import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface UsuarioResumen {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
}

export interface CrearUsuarioResponse extends UsuarioResumen {
  passwordInicial?: string;
}

@Injectable()
export class AuthClient {
  private readonly logger = new Logger(AuthClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'AUTH_API_URL',
      'http://localhost:4000/api',
    );
  }

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
      const { data } = await firstValueFrom(
        this.http.post<CrearUsuarioResponse>(`${this.baseUrl}/usuarios`, datos),
      );
      return data;
    } catch (error) {
      this.logger.warn(
        `Auth no disponible al crear usuario: ${(error as AxiosError).message}`,
      );
      return null;
    }
  }

  async obtenerUsuarios(ids: string[]): Promise<UsuarioResumen[]> {
    if (ids.length === 0) return [];
    try {
      const { data } = await firstValueFrom(
        this.http.get<UsuarioResumen[]>(`${this.baseUrl}/usuarios`, {
          params: { ids: ids.join(',') },
        }),
      );
      return data;
    } catch (error) {
      this.logger.warn(
        `Auth no respondió al resolver usuarios: ${(error as AxiosError).message}`,
      );
      return ids.map((id) => ({
        id,
        nombre: '',
        apellido: '',
        dni: '',
        fechaNacimiento: '',
        telefono: '',
        email: '',
        domicilio: '',
      }));
    }
  }

  async actualizarContacto(
    usuarioId: string,
    datos: Partial<Pick<UsuarioResumen, 'telefono' | 'email' | 'domicilio'>>,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.patch(`${this.baseUrl}/usuarios/${usuarioId}`, datos),
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `No se pudo propagar el contacto a Auth: ${(error as AxiosError).message}`,
      );
      return false;
    }
  }
}
