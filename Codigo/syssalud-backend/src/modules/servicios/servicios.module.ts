import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ServiciosController } from './servicios.controller';
import { ServiciosService } from './servicios.service';
import { Servicio } from './entities/servicio.entity';
import { ServicioProfesional } from './entities/servicio-profesional.entity';
import { ProfesionalesClient } from './clients/profesionales.client';

/**
 * Módulo Servicios — CUU10 (Mantener catálogo de servicios).
 *
 * SER-001: Sin acoplamiento en proceso con otros módulos.
 * SER-002: Dependencias por REST vía ProfesionalesClient.
 * SER-008: Registro de entidades en datasource.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Servicio, ServicioProfesional]),
    HttpModule.register({ timeout: 2000, maxRedirects: 5 })
  ],
  controllers: [ServiciosController],
  providers: [ServiciosService, ProfesionalesClient],
  exports: [] // SER-001: No exportar servicio para evitar inyección cruzada
})
export class ServiciosModule {}