import { Module } from '@nestjs/common';
import { ProfesionalesController } from './profesionales.controller';
import { ProfesionalesService } from './profesionales.service';

/** Módulo Profesionales — alta y horarios de atención (insumo de Agenda). */
@Module({
  controllers: [ProfesionalesController],
  providers: [ProfesionalesService],
  exports: [ProfesionalesService],
})
export class ProfesionalesModule {}
