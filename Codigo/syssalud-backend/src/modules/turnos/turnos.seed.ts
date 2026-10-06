import { DataSource } from 'typeorm';
import { EstadoTurno } from '@syssalud/shared-types';
import { Turno } from './entities/turno.entity';

/**
 * TUR-041: turnos demo idempotentes para el paciente demo (`paciente.seed.ts`,
 * DNI 30000000). `profesionalId`/`servicioId` son placeholders fijos — opacos
 * por diseño (TUR-001) — hasta que Profesionales/Servicios tengan datos reales.
 */
const PROFESIONAL_DEMO_ID = '00000000-0000-0000-0000-000000000001';
const SERVICIO_DEMO_ID = '00000000-0000-0000-0000-000000000002';

export async function seedTurnosSeed(dataSource: DataSource): Promise<void> {
  const pacienteRepo = dataSource.getRepository('Paciente');
  const turnosRepo = dataSource.getRepository(Turno);

  const pacienteDemo = await pacienteRepo.findOne({ where: { dni: '30000000' } });
  if (!pacienteDemo) {
    console.log('[Seed] Turnos: no hay paciente demo todavía, se omite.');
    return;
  }

  const existentes = await turnosRepo.count({ where: { pacienteId: pacienteDemo.id } });
  if (existentes > 0) {
    console.log('[Seed] Los turnos demo ya existen, se omite.');
    return;
  }

  const hoy = new Date();
  const enDiezDias = new Date(hoy.getTime() + 10 * 24 * 60 * 60 * 1000);
  const haceDiezDias = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000);

  const base = {
    pacienteId: pacienteDemo.id,
    profesionalId: PROFESIONAL_DEMO_ID,
    servicioId: SERVICIO_DEMO_ID,
    monto: 5000,
    pagoId: null,
    comprobanteNumero: null,
    reservaExpiraEn: null,
    creadoPor: pacienteDemo.id,
    origen: 'PACIENTE' as const,
    motivoCancelacion: null,
    idTransaccion: null,
  };

  await turnosRepo.save([
    turnosRepo.create({
      ...base,
      fecha: enDiezDias.toISOString().slice(0, 10),
      hora: '10:00',
      estado: EstadoTurno.CONFIRMADO,
      pagoId: '00000000-0000-0000-0000-000000000003',
      comprobanteNumero: 'CMP-DEMO-0001',
    }),
    turnosRepo.create({
      ...base,
      fecha: haceDiezDias.toISOString().slice(0, 10),
      hora: '11:00',
      estado: EstadoTurno.ASISTIDO,
      pagoId: '00000000-0000-0000-0000-000000000004',
      comprobanteNumero: 'CMP-DEMO-0002',
    }),
    turnosRepo.create({
      ...base,
      fecha: haceDiezDias.toISOString().slice(0, 10),
      hora: '12:00',
      estado: EstadoTurno.CANCELADO,
      motivoCancelacion: 'Cancelado por el paciente (seed demo).',
    }),
  ]);

  console.log('[Seed] Turnos demo creados correctamente.');
}
