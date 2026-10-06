import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ServicioProfesional } from './entities/servicio-profesional.entity';
import { Servicio } from './entities/servicio.entity';
import { ServiciosController } from './servicios.controller';
import { ServiciosService } from './servicios.service';

/**
 * Módulo Servicios — CUU10 (Mantener catálogo de servicios).
 * SER-001: sólo sus propios providers + `HttpModule`; no exporta el service
 * (Turnos, Agenda y Pagos lo consumen por REST, SER-030).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Servicio, ServicioProfesional]),
    HttpModule,
  ],
  controllers: [ServiciosController],
  providers: [ServiciosService, ProfesionalesClient, TurnosClient],
})
export class ServiciosModule {}
