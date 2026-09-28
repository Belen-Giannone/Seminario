import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';

/**
 * Requiere PostgreSQL levantado y usuarios demo creados con `npm run seed`.
 * Usa lenient para que Pacientes y Turnos puedan seguir siendo stubs durante
 * la integración inicial del módulo.
 */
describe('Historia Clínica (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const pacienteId = `e2e-${randomUUID()}`;

  beforeAll(async () => {
    process.env.HISTORIA_VALIDAR_TURNOS = 'lenient';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'profesional@syssalud.com', password: 'Syssalud2026!' })
      .expect(200);
    token = login.body.accessToken;
  });

  it('inicializa, agrega una entrada y la recupera en el timeline', async () => {
    await request(app.getHttpServer())
      .post(`/api/historia-clinica/${pacienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/historia-clinica/${pacienteId}/entradas`)
      .set('Authorization', `Bearer ${token}`)
      .send({ observaciones: 'Control e2e', antecedentes: '', tratamientos: '' })
      .expect(201)
      .expect((response) => {
        expect(response.body.mensaje).toBe('Historia clínica actualizada correctamente.');
        expect(response.body.entrada.idTurno).toBeNull();
      });

    await request(app.getHttpServer())
      .get(`/api/historia-clinica/${pacienteId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.pacienteId).toBe(pacienteId);
        expect(response.body.entradas[0].observaciones).toBe('Control e2e');
        expect(response.body.entradas[0].fechaActualizacion).toBeDefined();
      });
  });

  afterAll(async () => {
    await app.close();
    delete process.env.HISTORIA_VALIDAR_TURNOS;
  });
});
