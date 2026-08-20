import { Controller, Get } from '@nestjs/common';
import { MetricasDesempenoService } from './metricas-desempeno.service';

@Controller('metricas-desempeno')
export class MetricasDesempenoController {
  constructor(private readonly metricasDesempenoService: MetricasDesempenoService) {}

  @Get()
  estado() {
    return this.metricasDesempenoService.estado();
  }
}
