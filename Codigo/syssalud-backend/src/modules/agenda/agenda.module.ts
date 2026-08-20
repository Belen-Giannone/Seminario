import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';

/**
 * Módulo Agenda — CUU05 (Consultar agenda), lado lectura del par Agenda/Turnos.
 * Sin entidad propia: cruza Profesionales (horarios) + Turnos (ocupación).
 */
@Module({
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [AgendaService],
})
export class AgendaModule {}
