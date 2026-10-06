import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedPacienteSeed } from './modules/pacientes/paciente.seed';
import { seedProfesionalSeed } from './modules/profesionales/profesional.seed';
import { seedTurnosSeed } from './modules/turnos/turnos.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const dataSource = app.get(DataSource);
  // Ejecutamos el seed del paciente al arrancar la app (PAC-030)
  await seedPacienteSeed(dataSource);
  // PRO-030
  await seedProfesionalSeed(dataSource);
  // TUR-041
  await seedTurnosSeed(dataSource);

  await app.listen(4000);
  console.log(`Servidor NestJS corriendo en http://localhost:4000/api`);
}
bootstrap();
