import { DataSource } from 'typeorm';
import { DiaSemana } from '@syssalud/shared-types';
import { Profesional } from './entities/profesional.entity';
import { HorarioAtencion } from './entities/horario-atencion.entity';

/**
 * PRO-030: da de alta al `Profesional` del usuario demo
 * `profesional@syssalud.com` (ya creado por `database/seed.ts`), con
 * horarios lunes a viernes 09-13 y 14-18. Idempotente por `usuarioId`.
 */
export async function seedProfesionalSeed(
  dataSource: DataSource,
): Promise<void> {
  const usuariosRepo = dataSource.getRepository<{ id: string; email: string }>(
    'Usuario',
  );
  const profesionalesRepo = dataSource.getRepository(Profesional);
  const horariosRepo = dataSource.getRepository(HorarioAtencion);

  const emailSeed = 'profesional@syssalud.com';
  const usuario = await usuariosRepo.findOne({ where: { email: emailSeed } });
  if (!usuario) {
    console.log(
      `[Seed] Profesionales: no hay usuario ${emailSeed} todavía, se omite.`,
    );
    return;
  }

  const existente = await profesionalesRepo.findOne({
    where: { usuarioId: usuario.id },
  });
  if (existente) {
    console.log(
      `[Seed] El profesional de ${emailSeed} ya se encuentra registrado.`,
    );
    return;
  }

  const profesional = await profesionalesRepo.save(
    profesionalesRepo.create({
      usuarioId: usuario.id,
      especialidad: 'Dermatología',
      matricula: 'MP-SEED-0001',
    }),
  );

  await horariosRepo.save(
    [
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES,
    ].flatMap((diaSemana) => [
      horariosRepo.create({
        profesionalId: profesional.id,
        diaSemana,
        horaInicio: '09:00',
        horaFin: '13:00',
      }),
      horariosRepo.create({
        profesionalId: profesional.id,
        diaSemana,
        horaInicio: '14:00',
        horaFin: '18:00',
      }),
    ]),
  );

  console.log(
    `[Seed] Profesional ${emailSeed} creado correctamente con éxito.`,
  );
}
