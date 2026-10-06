import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorarioAtencion } from './entities/horario-atencion.entity';
import { Profesional } from './entities/profesional.entity';
import { ProfesionalesController } from './profesionales.controller';
import { ProfesionalesService } from './profesionales.service';
import { AuthClient } from './clients/auth.client';
import { AuthModule } from '../auth/auth.module';

/**
 * PRO-001: sin acoplamiento en proceso con otros feature modules — sólo sus
 * propios providers + `AuthClient` (hacia el módulo plataforma Auth). No
 * exporta `ProfesionalesService`: los consumidores (Agenda, Servicios,
 * Turnos, Métricas) usan su propio cliente REST contra `/api/profesionales`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Profesional, HorarioAtencion]),
    AuthModule,
  ],
  controllers: [ProfesionalesController],
  providers: [ProfesionalesService, AuthClient],
})
export class ProfesionalesModule {}
