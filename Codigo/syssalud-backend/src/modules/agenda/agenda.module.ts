import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ServiciosClient } from './clients/servicios.client';
import { FeriadosClient } from './clients/feriados.client';

/**
 * Módulo Agenda (Pareja C, lado lectura) — CUU05. AGE-001: sin acoplamiento en
 * proceso, no importa `ProfesionalesService`/`TurnosService`; sólo sus propios
 * providers + clientes REST. No exporta `AgendaService` (los consumidores usan
 * `AgendaClient` propio, vía HTTP, no inyección directa).
 */
@Module({
  controllers: [AgendaController],
  providers: [
    AgendaService,
    ProfesionalesClient,
    TurnosClient,
    ServiciosClient,
    FeriadosClient,
  ],
})
export class AgendaModule {}
