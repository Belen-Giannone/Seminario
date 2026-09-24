import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HorarioAtencion } from './entities/horario-atencion.entity';
import { Profesional } from './entities/profesional.entity';
import { ProfesionalesController } from './profesionales.controller';
import { ProfesionalesService } from './profesionales.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profesional, HorarioAtencion])],
  controllers: [ProfesionalesController],
  providers: [ProfesionalesService],
  exports: [ProfesionalesService],
})
export class ProfesionalesModule {}
