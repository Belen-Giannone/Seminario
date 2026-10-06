import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';
import { EntradaClinica } from './entities/entrada-clinica.entity';
import { HistoriaClinica } from './entities/historia-clinica.entity';
import { PacientesClient } from './clients/pacientes.client';
import { TurnosClient } from './clients/turnos.client';

/**
 * Módulo Historia Clínica — CUU09. Acceso exclusivo del Profesional (RN10):
 * ningún otro rol puede leer ni escribir esta entidad.
 */
@Module({
  imports: [TypeOrmModule.forFeature([HistoriaClinica, EntradaClinica])],
  controllers: [HistoriaClinicaController],
  providers: [HistoriaClinicaService, PacientesClient, TurnosClient],
})
export class HistoriaClinicaModule {}
