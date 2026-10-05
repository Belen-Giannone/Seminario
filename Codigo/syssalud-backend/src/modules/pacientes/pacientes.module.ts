import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paciente } from './entities/paciente.entity';
import { PacientesController } from './pacientes.controller';
import { PacientesService } from './pacientes.service';
import { AuthClient } from './clients/auth.client';
import { NotificacionesClient } from './clients/notificaciones.client';

@Module({
  imports: [TypeOrmModule.forFeature([Paciente]), HttpModule],
  controllers: [PacientesController],
  providers: [PacientesService, AuthClient, NotificacionesClient],
  exports: [],
})
export class PacientesModule {}
