import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { EstadoPago, MetodoPago } from '@syssalud/shared-types';

export interface ResultadoPago {
  estado: EstadoPago;
  pagoId: string;
  comprobanteNumero?: string;
}

/** Costura saliente hacia Pagos (TUR-026): procesar el pago y ajustar reembolsos. */
@Injectable()
export class PagosClient {
  private readonly logger = new Logger(PagosClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'PAGOS_API_URL',
      'http://localhost:4000/api',
    );
  }

  /** `POST /api/pagos`. `null` si la costura degrada: el turno queda `pagoPendiente`. */
  async procesar(
    turnoId: string,
    metodo: MetodoPago,
    monto: number,
    idTransaccion: string,
  ): Promise<ResultadoPago | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<ResultadoPago>(`${this.baseUrl}/pagos`, {
          turnoId,
          metodo,
          monto,
          idTransaccion,
        }),
      );
      return res.data;
    } catch (error) {
      this.logger.warn(
        `No se pudo procesar el pago del turno ${turnoId} (TUR-002): queda pagoPendiente — ${(error as AxiosError).message}`,
      );
      return null;
    }
  }

  /** `POST /api/pagos/:id/reembolso` (RN21/RN23). Best-effort, nunca lanza. */
  async ajustarReembolso(pagoId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/pagos/${pagoId}/reembolso`, {}),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo ajustar el reembolso del pago ${pagoId} (TUR-002): queda pendiente de conciliación manual — ${(error as AxiosError).message}`,
      );
    }
  }
}
