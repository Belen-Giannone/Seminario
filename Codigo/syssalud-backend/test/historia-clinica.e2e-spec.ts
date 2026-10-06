import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type {
  AuthResponse,
  EntradaCreadaResponse,
  HistoriaClinica,
  HistoriaClinicaInexistente,
} from '@syssalud/shared-types';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PacientesClient } from './../src/modules/historia-clinica/clients/pacientes.client';
import { TurnosClient } from './../src/modules/historia-clinica/clients/turnos.client';

/**
 * HCL-032 — CUU09 de punta a punta: buscar → sin HC → inicializar → entrada →
 * timeline. Requiere PostgreSQL levantado y los usuarios demo (`npm run seed`).
 * Las costuras a Pacientes y Turnos se reemplazan por dobles, así la prueba no
 * depende del estado de esos módulos; Turnos "caído" ejercita el modo lenient.
 */
describe('Historia Clínica (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const pacienteId = randomUUID();
  const dni = String(Date.now()).slice(-8);

  beforeAll(async () => {
    process.env.HISTORIA_VALIDAR_TURNOS = 'lenient';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PacientesClient)
      .useValue({
        buscar: () =>
          Promise.resolve([
            {
              id: pacienteId,
              numeroPaciente: 1,
              nombreCompleto: 'Paciente E2E',
              dni,
            },
          ]),
        obtener: () =>
          Promise.resolve({
            id: pacienteId,
            nombre: 'Paciente',
            apellido: 'E2E',
            telefono: '3410000000',
            email: 'e2e@syssalud.com',
          }),
        disponible: () => Promise.resolve(true),
      })
      .overrideProvider(TurnosClient)
      .useValue({
        turnosAsistidos: () =>
          Promise.reject(new Error('Turnos no disponible')),
        disponible: () => Promise.resolve(false),
      })
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'profesional@syssalud.com', password: 'Syssalud2026!' })
      .expect(200);
    token = (login.body as AuthResponse).accessToken;
  });

  it('busca, inicializa, agrega una entrada y la recupera en el timeline', async () => {
    const server = app.getHttpServer();
    const auth = `Bearer ${token}`;

    const busqueda = await request(server)
      .get('/api/historia-clinica')
      .query({ dni })
      .set('Authorization', auth)
      .expect(200);
    expect(busqueda.body as HistoriaClinicaInexistente).toEqual({
      existe: false,
      pacienteId,
    });

    await request(server)
      .post(`/api/historia-clinica/${pacienteId}`)
      .set('Authorization', auth)
      .expect(201);

    const creada = await request(server)
      .post(`/api/historia-clinica/${pacienteId}/entradas`)
      .set('Authorization', auth)
      .send({
        observaciones: 'Control e2e',
        antecedentes: '',
        tratamientos: '',
      })
      .expect(201);
    const { mensaje, entrada } = creada.body as EntradaCreadaResponse;
    expect(mensaje).toBe('Historia clínica actualizada correctamente.');
    expect(entrada.idTurno).toBeNull();

    const timeline = await request(server)
      .get(`/api/historia-clinica/${pacienteId}`)
      .set('Authorization', auth)
      .expect(200);
    const historia = timeline.body as HistoriaClinica;
    expect(historia.pacienteId).toBe(pacienteId);
    expect(historia.nomAppPac).toBe('Paciente E2E');
    expect(historia.entradas[0].observaciones).toBe('Control e2e');
    expect(historia.entradas[0].fechaActualizacion).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.HISTORIA_VALIDAR_TURNOS;
  });
});
