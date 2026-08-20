import { Module } from '@nestjs/common';
import { MetricasNegocioController } from './metricas-negocio.controller';
import { MetricasNegocioService } from './metricas-negocio.service';

/** Módulo Métricas de Negocio — CUU07, exclusivo del Dueño (RN14). */
@Module({
  controllers: [MetricasNegocioController],
  providers: [MetricasNegocioService],
  exports: [MetricasNegocioService],
})
export class MetricasNegocioModule {}
