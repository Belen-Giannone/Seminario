import * as bcrypt from 'bcryptjs';
import { DataSource, In, Repository } from 'typeorm';
import {
  AltaPor,
  DiaSemana,
  EstadoPaciente,
  EstadoTurno,
  Rol,
} from '@syssalud/shared-types';
import { dataSourceOptions } from './data-source';
import { Usuario } from '../modules/auth/entities/usuario.entity';
import { Paciente } from '../modules/pacientes/entities/paciente.entity';
import { Profesional } from '../modules/profesionales/entities/profesional.entity';
import { HorarioAtencion } from '../modules/profesionales/entities/horario-atencion.entity';
import { Turno } from '../modules/turnos/entities/turno.entity';
import { HistoriaClinica } from '../modules/historia-clinica/entities/historia-clinica.entity';
import { EntradaClinica } from '../modules/historia-clinica/entities/entrada-clinica.entity';
import { Servicio } from '../modules/servicios/entities/servicio.entity';
import { ServicioProfesional } from '../modules/servicios/entities/servicio-profesional.entity';

/**
 * Datos de DEMO para ver los módulos con contenido: profesionales con horarios,
 * pacientes, catálogo de servicios, turnos de la semana pasada, esta y la
 * próxima, e historias clínicas.
 *
 * Es sólo para desarrollo/presentación. Escribe directo en la base (no pasa
 * por las APIs), por eso vive acá y no en un módulo.
 *
 * Requisitos: base levantada, `npm run seed` (usuarios demo) y haber arrancado
 * el backend una vez (crea las tablas y el profesional demo).
 *
 * Uso:
 *   npm run seed:demo --workspace=syssalud-backend
 *   npm run seed:demo --workspace=syssalud-backend -- --reset   (regenera los turnos de demo con fechas de hoy)
 */

const DEMO_PASSWORD = 'Syssalud2026!';
/** Marca los turnos creados por este script (`creadoPor`), para poder regenerarlos. */
const SEED_ID = 'de300000-0000-4000-8000-000000000001';

/** Catálogo demo (SER-037). `profesionales` son índices de PROFESIONALES. */
const SERVICIOS = [
  {
    nombre: 'Consulta dermatológica',
    descripcion: 'Evaluación de la piel y plan de tratamiento personalizado.',
    duracionMin: 30,
    precio: 15000,
    profesionales: [0],
  },
  {
    nombre: 'Peeling químico',
    descripcion: 'Renovación de la piel con ácidos para manchas y textura.',
    duracionMin: 45,
    precio: 28000,
    profesionales: [0, 2],
  },
  {
    nombre: 'Aplicación de toxina botulínica',
    descripcion: 'Tratamiento de líneas de expresión en tercio superior.',
    duracionMin: 30,
    precio: 95000,
    profesionales: [2],
  },
  {
    nombre: 'Consulta prequirúrgica',
    descripcion:
      'Evaluación previa a cirugía plástica, estudios y consentimiento.',
    duracionMin: 60,
    precio: 40000,
    profesionales: [1],
  },
  {
    nombre: 'Control postoperatorio',
    descripcion: 'Seguimiento de la evolución luego de una cirugía.',
    duracionMin: 30,
    precio: 12000,
    profesionales: [1],
  },
];

const PROFESIONALES = [
  {
    email: 'profesional@syssalud.com',
    nombre: 'Carlos',
    apellido: 'Bilardo',
    especialidad: 'Dermatología',
    matricula: 'MP-SEED-0001',
  },
  {
    email: 'lucia.ferreyra@syssalud.com',
    nombre: 'Lucía',
    apellido: 'Ferreyra',
    especialidad: 'Cirugía plástica',
    matricula: 'MP-DEMO-0002',
  },
  {
    email: 'martin.rossi@syssalud.com',
    nombre: 'Martín',
    apellido: 'Rossi',
    especialidad: 'Medicina estética',
    matricula: 'MP-DEMO-0003',
  },
];

const PACIENTES = [
  { dni: '40111001', nombre: 'Valentina', apellido: 'Gómez' },
  { dni: '40111002', nombre: 'Juan Pablo', apellido: 'Martínez' },
  { dni: '40111003', nombre: 'Camila', apellido: 'López' },
  { dni: '40111004', nombre: 'Santiago', apellido: 'Fernández' },
  { dni: '40111005', nombre: 'Florencia', apellido: 'Díaz' },
  { dni: '40111006', nombre: 'Mateo', apellido: 'Romero' },
  { dni: '40111007', nombre: 'Agustina', apellido: 'Sosa' },
  { dni: '40111008', nombre: 'Tomás', apellido: 'Álvarez' },
];

const HORAS_MANANA = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
];
const HORAS_TARDE = [
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

const OBSERVACIONES = [
  {
    observaciones:
      'Control post tratamiento. Buena evolución, sin signos de irritación.',
    tratamientos: 'Continuar con protector solar FPS 50 y crema hidratante.',
    antecedentes: '',
  },
  {
    observaciones: 'Consulta inicial por manchas en zona malar.',
    tratamientos: 'Peeling químico suave, 3 sesiones cada 15 días.',
    antecedentes: 'Alergia a la penicilina.',
  },
  {
    observaciones:
      'Paciente refiere mejoría notable respecto a la consulta anterior.',
    tratamientos: '',
    antecedentes: 'Hipotiroidismo en tratamiento.',
  },
];

const ds = new DataSource({
  ...dataSourceOptions,
  entities: [
    Usuario,
    Paciente,
    Profesional,
    HorarioAtencion,
    Turno,
    HistoriaClinica,
    EntradaClinica,
    Servicio,
    ServicioProfesional,
  ],
  synchronize: false,
});

/** `YYYY-MM-DD` en hora local. */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Días hábiles (L-V) desde el lunes de la semana pasada hasta el viernes de la próxima. */
function diasHabiles(): Date[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const lunesPasado = new Date(hoy);
  lunesPasado.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 7);
  const dias: Date[] = [];
  for (let i = 0; i < 19; i++) {
    const d = new Date(lunesPasado);
    d.setDate(lunesPasado.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) dias.push(d);
  }
  return dias;
}

async function asegurarProfesional(
  usuarios: Repository<Usuario>,
  profesionales: Repository<Profesional>,
  horarios: Repository<HorarioAtencion>,
  passwordHash: string,
  datos: (typeof PROFESIONALES)[number],
): Promise<Profesional> {
  let usuario = await usuarios.findOne({ where: { email: datos.email } });
  if (!usuario) {
    usuario = await usuarios.save(
      usuarios.create({
        email: datos.email,
        nombre: datos.nombre,
        apellido: datos.apellido,
        rol: Rol.PROFESIONAL,
        passwordHash,
      }),
    );
    console.log(`✓ usuario ${datos.email}`);
  }

  const existente = await profesionales.findOne({
    where: { usuarioId: usuario.id },
  });
  if (existente) return existente;

  const profesional = await profesionales.save(
    profesionales.create({
      usuarioId: usuario.id,
      especialidad: datos.especialidad,
      matricula: datos.matricula,
    }),
  );
  await horarios.save(
    [
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES,
    ].flatMap((diaSemana) => [
      horarios.create({
        profesionalId: profesional.id,
        diaSemana,
        horaInicio: '09:00',
        horaFin: '13:00',
      }),
      horarios.create({
        profesionalId: profesional.id,
        diaSemana,
        horaInicio: '14:00',
        horaFin: '18:00',
      }),
    ]),
  );
  console.log(
    `✓ profesional ${datos.nombre} ${datos.apellido} (${datos.especialidad})`,
  );
  return profesional;
}

async function asegurarPacientes(
  pacientes: Repository<Paciente>,
): Promise<Paciente[]> {
  const resultado: Paciente[] = [];
  for (const datos of PACIENTES) {
    let paciente = await pacientes.findOne({ where: { dni: datos.dni } });
    if (!paciente) {
      const { max } = (await pacientes
        .createQueryBuilder('p')
        .select('MAX(p.numeroPaciente)', 'max')
        .getRawOne<{ max: number | null }>()) ?? { max: 0 };
      paciente = await pacientes.save(
        pacientes.create({
          ...datos,
          usuarioId: null,
          estado: EstadoPaciente.ACTIVO,
          altaPor: AltaPor.ADM,
          numeroPaciente: Number(max ?? 0) + 1,
        }),
      );
      console.log(`✓ paciente ${datos.nombre} ${datos.apellido}`);
    }
    resultado.push(paciente);
  }
  return resultado;
}

/** Idempotente por nombre: crea el servicio y sus profesionales si no existe. */
async function asegurarServicios(
  profesionales: Profesional[],
): Promise<Servicio[]> {
  const servicios = ds.getRepository(Servicio);
  const asociaciones = ds.getRepository(ServicioProfesional);
  const resultado: Servicio[] = [];
  for (const { profesionales: indices, ...datos } of SERVICIOS) {
    let servicio = await servicios.findOne({
      where: { nombre: datos.nombre },
      relations: { servicioProfesionales: true },
    });
    if (!servicio) {
      servicio = await servicios.save(servicios.create(datos));
      servicio.servicioProfesionales = await asociaciones.save(
        indices.map((i) =>
          asociaciones.create({
            servicioId: servicio.id,
            profesionalId: profesionales[i].id,
          }),
        ),
      );
      console.log(`✓ servicio ${datos.nombre}`);
    }
    resultado.push(servicio);
  }
  return resultado;
}

async function crearTurnos(
  turnos: Repository<Turno>,
  profesionales: Profesional[],
  pacientes: Paciente[],
  servicios: Servicio[],
): Promise<Turno[]> {
  const hoy = iso(new Date());
  const dias = diasHabiles();
  const nuevos: Turno[] = [];
  let p = 0;

  profesionales.forEach((profesional, iProf) => {
    // El profesional demo tiene la agenda más cargada; los otros, algunos turnos.
    dias.forEach((dia, iDia) => {
      const porDia = iProf === 0 ? 2 : iDia % 2 === 0 ? 1 : 0;
      for (let k = 0; k < porDia; k++) {
        const fecha = iso(dia);
        const pasado = fecha < hoy;
        const horas = (iDia + k) % 2 === 0 ? HORAS_MANANA : HORAS_TARDE;
        const hora = horas[(iDia * 2 + k * 3 + iProf) % horas.length];
        const paciente = pacientes[p++ % pacientes.length];
        // Un servicio que efectivamente brinda este profesional.
        const propios = servicios.filter((sv) =>
          sv.servicioProfesionales.some(
            (sp) => sp.profesionalId === profesional.id,
          ),
        );
        const servicio = propios[(iDia + k) % propios.length];

        let estado = pasado ? EstadoTurno.ASISTIDO : EstadoTurno.CONFIRMADO;
        if (!pasado && (iDia + k) % 5 === 1) estado = EstadoTurno.SOLICITADO;
        if (!pasado && (iDia + k) % 7 === 3) estado = EstadoTurno.REPROGRAMADO;
        if ((iDia + k + iProf) % 9 === 4) estado = EstadoTurno.CANCELADO;

        nuevos.push(
          turnos.create({
            pacienteId: paciente.id,
            profesionalId: profesional.id,
            servicioId: servicio.id,
            fecha,
            hora,
            estado,
            monto: servicio.precio,
            pagoId: null,
            comprobanteNumero:
              estado === EstadoTurno.SOLICITADO
                ? null
                : `CMP-DEMO-${String(nuevos.length + 1).padStart(4, '0')}`,
            // Las reservas pendientes vencen en una semana para que se vean en la demo.
            reservaExpiraEn:
              estado === EstadoTurno.SOLICITADO
                ? new Date(Date.now() + 7 * 86_400_000)
                : null,
            creadoPor: SEED_ID,
            origen: 'ASISTENTE',
            motivoCancelacion:
              estado === EstadoTurno.CANCELADO
                ? 'Cancelado por el paciente (demo).'
                : null,
            idTransaccion: null,
          }),
        );
      }
    });
  });

  return turnos.save(nuevos);
}

async function crearHistorias(
  historias: Repository<HistoriaClinica>,
  entradas: Repository<EntradaClinica>,
  turnosAsistidos: Turno[],
): Promise<void> {
  let creadas = 0;
  for (const [i, turno] of turnosAsistidos.entries()) {
    let historia = await historias.findOne({
      where: { pacienteId: turno.pacienteId },
    });
    if (!historia)
      historia = await historias.save(
        historias.create({ pacienteId: turno.pacienteId }),
      );
    const yaTiene = await entradas.count({ where: { turnoId: turno.id } });
    if (yaTiene) continue;
    await entradas.save(
      entradas.create({
        historiaId: historia.id,
        turnoId: turno.id,
        profesionalId: turno.profesionalId,
        fecha: turno.fecha,
        ...OBSERVACIONES[i % OBSERVACIONES.length],
      }),
    );
    creadas++;
  }
  console.log(`✓ ${creadas} entradas de historia clínica`);
}

async function main() {
  const reset = process.argv.includes('--reset');
  await ds.initialize();

  const usuarios = ds.getRepository(Usuario);
  const profesionalesRepo = ds.getRepository(Profesional);
  const horarios = ds.getRepository(HorarioAtencion);
  const turnos = ds.getRepository(Turno);

  if (
    !(await usuarios.findOne({ where: { email: 'profesional@syssalud.com' } }))
  ) {
    throw new Error('Faltan los usuarios demo: corré primero `npm run seed`.');
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const profesionales: Profesional[] = [];
  for (const datos of PROFESIONALES) {
    profesionales.push(
      await asegurarProfesional(
        usuarios,
        profesionalesRepo,
        horarios,
        passwordHash,
        datos,
      ),
    );
  }
  const pacientes = await asegurarPacientes(ds.getRepository(Paciente));
  const servicios = await asegurarServicios(profesionales);

  if (reset) {
    const viejos = await turnos.find({ where: { creadoPor: SEED_ID } });
    await ds
      .getRepository(EntradaClinica)
      .delete({ turnoId: In(viejos.map((t) => t.id)) });
    await turnos.delete({ creadoPor: SEED_ID });
    console.log(`↺ ${viejos.length} turnos de demo borrados`);
  }

  if ((await turnos.count({ where: { creadoPor: SEED_ID } })) > 0) {
    console.log(
      '↷ Los turnos de demo ya existen (usá --reset para regenerarlos con fechas de hoy).',
    );
  } else {
    const creados = await crearTurnos(
      turnos,
      profesionales,
      pacientes,
      servicios,
    );
    console.log(`✓ ${creados.length} turnos de demo`);
    await crearHistorias(
      ds.getRepository(HistoriaClinica),
      ds.getRepository(EntradaClinica),
      creados.filter((t) => t.estado === EstadoTurno.ASISTIDO),
    );
  }

  console.log(
    `\nProfesionales demo: ${PROFESIONALES.map((p) => p.email).join(', ')}`,
  );
  console.log(`Contraseña: ${DEMO_PASSWORD}`);
  await ds.destroy();
}

main().catch(async (err) => {
  console.error(
    'Error al ejecutar el seed de demo:',
    err instanceof Error ? err.message : err,
  );
  if (ds.isInitialized) await ds.destroy();
  process.exit(1);
});
