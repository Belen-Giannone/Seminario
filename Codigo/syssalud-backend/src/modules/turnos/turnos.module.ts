import { Module } from '@nestjs/common';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';

/**
 * Módulo Turnos — CUU02, CUU03, CUU04 (lado escritura del par Agenda/Turnos).
 * Entidad propia futura: `Turno`, con su máquina de estados (ver ART ME).
 */
@Module({
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
