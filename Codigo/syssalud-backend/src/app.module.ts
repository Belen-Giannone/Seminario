import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { HistoriaClinicaModule } from './modules/historia-clinica/historia-clinica.module';
import { ServiciosModule } from './modules/servicios/servicios.module';
import { ProfesionalesModule } from './modules/profesionales/profesionales.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { TurnosModule } from './modules/turnos/turnos.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { MetricasNegocioModule } from './modules/metricas-negocio/metricas-negocio.module';
import { MetricasDesempenoModule } from './modules/metricas-desempeno/metricas-desempeno.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'syssalud'),
        password: config.get<string>('DB_PASSWORD', 'syssalud'),
        database: config.get<string>('DB_NAME', 'syssalud'),
        autoLoadEntities: true,
        // TP: sin migraciones formales todavía, TypeORM sincroniza el schema.
        synchronize: true,
      }),
    }),

    // Módulo 0 — Auth / IAM
    AuthModule,

    // Pareja A — Pacientes & Historia Clínica
    PacientesModule,
    HistoriaClinicaModule,

    // Pareja B — Servicios & Profesionales
    ServiciosModule,
    ProfesionalesModule,

    // Pareja C — Agenda & Turnos
    AgendaModule,
    TurnosModule,

    // Pareja D — Pagos & Notificaciones
    PagosModule,
    NotificacionesModule,

    // Pareja E — Métricas
    MetricasNegocioModule,
    MetricasDesempenoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
