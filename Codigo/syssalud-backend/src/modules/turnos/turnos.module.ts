import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Turno } from './entities/turno.entity';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { PacientesClient } from './clients/pacientes.client';
import { ServiciosClient } from './clients/servicios.client';
import { ProfesionalesClient } from './clients/profesionales.client';
import { AgendaClient } from './clients/agenda.client';
import { PagosClient } from './clients/pagos.client';
import { NotificacionesClient } from './clients/notificaciones.client';

/**
 * Módulo Turnos (Pareja C, lado escritura) — CUU02/03/04. TUR-001: sin
 * acoplamiento en proceso, sólo sus propios providers + clientes REST.
 * No exporta `TurnosService`: los consumidores (Agenda, Historia Clínica,
 * Métricas) usan su propio `TurnosClient` vía HTTP.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Turno]), HttpModule],
  controllers: [TurnosController],
  providers: [
    TurnosService,
    PacientesClient,
    ServiciosClient,
    ProfesionalesClient,
    AgendaClient,
    PagosClient,
    NotificacionesClient,
  ],
})
export class TurnosModule {}
