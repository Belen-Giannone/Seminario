import { Module } from '@nestjs/common';
import { MetricasDesempenoController } from './metricas-desempeno.controller';
import { MetricasDesempenoService } from './metricas-desempeno.service';

/** Módulo Métricas de Desempeño — CUU08, exclusivo del Profesional sobre sí mismo (RN15). */
@Module({
  controllers: [MetricasDesempenoController],
  providers: [MetricasDesempenoService],
  exports: [MetricasDesempenoService],
})
export class MetricasDesempenoModule {}
