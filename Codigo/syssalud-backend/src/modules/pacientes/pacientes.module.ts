import { Module } from '@nestjs/common';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';

/**
 * Módulo Pacientes — CUU01 (Registrar paciente).
 * Entidad propia futura: `Paciente` (perfil de negocio, referenciando `Usuario` de Auth por id).
 * Ver ART CRUD: Paciente = C por ADM/autorregistro.
 */
@Module({
  controllers: [PacientesController],
  providers: [PacientesService],
  exports: [PacientesService],
})
export class PacientesModule {}
