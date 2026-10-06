import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedProfesionalSeed } from './modules/profesionales/profesional.seed';

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

  // PRO-030
  await seedProfesionalSeed(app.get(DataSource));

  await app.listen(4000);
  console.log(`Servidor NestJS corriendo en http://localhost:4000/api`);
}
bootstrap();
