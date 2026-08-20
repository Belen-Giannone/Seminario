import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getEstado() {
    return {
      servicio: 'syssalud-backend',
      estado: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
