import { Controller, Get } from '@nestjs/common';
import { MetricasNegocioService } from './metricas-negocio.service';

@Controller('metricas-negocio')
export class MetricasNegocioController {
  constructor(private readonly metricasNegocioService: MetricasNegocioService) {}

  @Get()
  estado() {
    return this.metricasNegocioService.estado();
  }
}
