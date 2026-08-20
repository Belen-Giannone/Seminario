import * as bcrypt from 'bcryptjs';
import { Rol } from '@syssalud/shared-types';
import { AppDataSource } from './data-source';
import { Usuario } from '../modules/auth/entities/usuario.entity';

/**
 * Crea un usuario demo por rol para poder probar el login sin pasar por el
 * registro público (que solo da de alta pacientes). Idempotente: si el email
 * ya existe, lo salta.
 *
 * Uso: npm run seed --workspace=syssalud-backend  (o `npm run seed` desde la raíz)
 */
const DEMO_PASSWORD = 'Syssalud2026!';

const demoUsers: Array<Partial<Usuario>> = [
  {
    email: 'paciente@syssalud.com',
    nombre: 'Dolores',
    apellido: 'Campos',
    dni: '30111222',
    rol: Rol.PACIENTE,
    telefono: '3411234567',
    domicilio: 'San Martín 123, Rosario',
    fechaNacimiento: '1990-04-12',
  },
  {
    email: 'asistente@syssalud.com',
    nombre: 'Paula',
    apellido: 'Orden',
    rol: Rol.ASISTENTE,
  },
  {
    email: 'profesional@syssalud.com',
    nombre: 'Carlos',
    apellido: 'Bilardo',
    rol: Rol.PROFESIONAL,
  },
  {
    email: 'dueno@syssalud.com',
    nombre: 'Norma',
    apellido: 'Regla',
    rol: Rol.DUENO,
  },
];

async function seed() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Usuario);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const data of demoUsers) {
    const existente = await repo.findOne({ where: { email: data.email } });
    if (existente) {
      console.log(`↷ ${data.email} ya existe, se omite`);
      continue;
    }
    await repo.save(repo.create({ ...data, passwordHash }));
    console.log(`✓ creado ${data.rol} · ${data.email}`);
  }

  console.log(`\nContraseña para todos los usuarios demo: ${DEMO_PASSWORD}`);
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error al ejecutar el seed:', err);
  process.exit(1);
});
