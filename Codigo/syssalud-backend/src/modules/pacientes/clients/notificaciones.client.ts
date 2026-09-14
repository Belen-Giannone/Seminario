import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificacionesClient {
  private readonly logger = new Logger(NotificacionesClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'NOTIFICACIONES_API_URL',
      'http://localhost:4000/api',
    );
  }

  async enviar(email: string, mensaje: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/notificaciones`, { email, mensaje }),
      );
    } catch (error) {
      this.logger.warn(
        `Notificación no enviada a ${email} (queda solo en log): ${mensaje} — ${(error as AxiosError).message}`,
      );
    }
  }
}
