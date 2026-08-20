import { Module } from '@nestjs/common';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';

/**
 * Módulo Historia Clínica — CUU09. Acceso exclusivo del Profesional (RN10):
 * ningún otro rol puede leer ni escribir esta entidad.
 */
@Module({
  controllers: [HistoriaClinicaController],
  providers: [HistoriaClinicaService],
  exports: [HistoriaClinicaService],
})
export class HistoriaClinicaModule {}
