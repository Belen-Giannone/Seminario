import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthResponse, Servicio } from '@syssalud/shared-types';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { ProfesionalesClient } from './../src/modules/servicios/clients/profesionales.client';

/**
 * SER-042 — e2e del catálogo: POST → GET → PATCH precio → DELETE como ASISTENTE,
 * con Profesionales respondiendo (modo strict, valida ids) y caído (lenient).
 * Requiere PostgreSQL levantado y los usuarios demo (`npm run seed`).
 */
const PROF_OK = randomUUID();

async function levantar(costura: 'viva' | 'caida', modo: 'lenient' | 'strict') {
  process.env.SERVICIOS_VALIDAR_PROFESIONALES = modo;
  const profesionales = {
    modoValidacion: modo,
    resumenPorIds: (ids: string[]) =>
      Promise.resolve(
        ids.map((id) =>
          costura === 'viva' && id === PROF_OK
            ? {
                id,
                nombreCompleto: 'Prof E2E',
                especialidad: 'Dermatología',
                activo: true,
              }
            : { id },
        ),
      ),
    existenYSonProfesionales: (ids: string[]) =>
      Promise.resolve(
        costura === 'caida'
          ? { verificado: false, validos: [], invalidos: [] }
          : {
              verificado: true,
              validos: ids.filter((id) => id === PROF_OK),
              invalidos: ids.filter((id) => id !== PROF_OK),
            },
      ),
    disponible: () => Promise.resolve(costura === 'viva'),
  };
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ProfesionalesClient)
    .useValue(profesionales)
    .compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

async function token(
  app: INestApplication<App>,
  email: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: 'Syssalud2026!' })
    .expect(200);
  return (res.body as AuthResponse).accessToken;
}

describe('Servicios (e2e)', () => {
  const creados: string[] = [];
  let app: INestApplication<App>;

  afterEach(async () => {
    // Limpieza física de lo que creó la prueba (la baja del CRUD es lógica).
    if (creados.length) {
      await app
        .get(DataSource)
        .query('DELETE FROM servicios WHERE id = ANY($1)', [creados]);
      creados.length = 0;
    }
    await app.close();
    delete process.env.SERVICIOS_VALIDAR_PROFESIONALES;
  });

  it('strict con Profesionales vivo: alta, consulta, cambio de precio y baja', async () => {
    app = await levantar('viva', 'strict');
    const server = app.getHttpServer();
    const auth = `Bearer ${await token(app, 'asistente@syssalud.com')}`;
    const nombre = `Servicio e2e ${randomUUID().slice(0, 8)}`;

    await request(server)
      .post('/api/servicios')
      .set('Authorization', auth)
      .send({
        nombre,
        descripcion: 'd',
        duracionMin: 30,
        precio: 1000,
        profesionalIds: [randomUUID()],
      })
      .expect(400);

    const alta = await request(server)
      .post('/api/servicios')
      .set('Authorization', auth)
      .send({
        nombre,
        descripcion: 'd',
        duracionMin: 30,
        precio: 1000,
        profesionalIds: [PROF_OK],
      })
      .expect(201);
    const creado = alta.body as Servicio;
    creados.push(creado.id);
    expect(creado.profesionales).toEqual([
      {
        id: PROF_OK,
        nombreCompleto: 'Prof E2E',
        especialidad: 'Dermatología',
        activo: true,
      },
    ]);

    await request(server)
      .post('/api/servicios')
      .set('Authorization', auth)
      .send({
        nombre: nombre.toUpperCase(),
        descripcion: 'd',
        duracionMin: 30,
        precio: 1,
        profesionalIds: [PROF_OK],
      })
      .expect(409);

    const cambio = await request(server)
      .patch(`/api/servicios/${creado.id}`)
      .set('Authorization', auth)
      .send({ precio: 1250.5 })
      .expect(200);
    expect((cambio.body as Servicio).precio).toBe(1250.5);

    await request(server)
      .delete(`/api/servicios/${creado.id}`)
      .set('Authorization', auth)
      .expect(204);

    const activos = await request(server)
      .get('/api/servicios')
      .set('Authorization', auth)
      .expect(200);
    expect((activos.body as Servicio[]).some((s) => s.id === creado.id)).toBe(
      false,
    );
    const todos = await request(server)
      .get('/api/servicios?soloActivos=false')
      .set('Authorization', auth)
      .expect(200);
    expect(
      (todos.body as Servicio[]).find((s) => s.id === creado.id)?.activo,
    ).toBe(false);
  });

  it('strict con Profesionales caído responde 424; lenient acepta', async () => {
    app = await levantar('caida', 'strict');
    let auth = `Bearer ${await token(app, 'asistente@syssalud.com')}`;
    const cuerpo = {
      nombre: `Servicio e2e ${randomUUID().slice(0, 8)}`,
      descripcion: 'd',
      duracionMin: 45,
      precio: 500,
      profesionalIds: [randomUUID()],
    };
    await request(app.getHttpServer())
      .post('/api/servicios')
      .set('Authorization', auth)
      .send(cuerpo)
      .expect(424);
    await app.close();

    app = await levantar('caida', 'lenient');
    auth = `Bearer ${await token(app, 'asistente@syssalud.com')}`;
    const res = await request(app.getHttpServer())
      .post('/api/servicios')
      .set('Authorization', auth)
      .send(cuerpo)
      .expect(201);
    creados.push((res.body as Servicio).id);
  });

  it('RBAC: el paciente lee el catálogo pero no puede escribir', async () => {
    app = await levantar('viva', 'lenient');
    const auth = `Bearer ${await token(app, 'paciente@syssalud.com')}`;
    await request(app.getHttpServer())
      .get('/api/servicios')
      .set('Authorization', auth)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/servicios')
      .set('Authorization', auth)
      .send({
        nombre: 'x',
        descripcion: 'd',
        duracionMin: 30,
        precio: 1,
        profesionalIds: [PROF_OK],
      })
      .expect(403);
  });
});
