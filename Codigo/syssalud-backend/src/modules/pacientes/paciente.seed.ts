import { DataSource } from 'typeorm';
import { EstadoPaciente, AltaPor } from '@syssalud/shared-types';
import { Paciente } from './entities/paciente.entity';

export async function seedPacienteSeed(dataSource: DataSource): Promise<void> {
  const pacienteRepo = dataSource.getRepository(Paciente);

  const dniSeed = '30000000'; // DNI de prueba para el seed del paciente por defecto
  const emailSeed = 'paciente@syssalud.com';

  const existe = await pacienteRepo.findOne({
    where: { dni: dniSeed },
  });

  if (!existe) {
    const { max } = await pacienteRepo
      .createQueryBuilder('p')
      .select('MAX(p.numeroPaciente)', 'max')
      .getRawOne<{ max: number | null }>();

    const nuevoNumero = Number(max ?? 0) + 1;

    const pacienteSeed = pacienteRepo.create({
      usuarioId: null, // Cambiar si tu Auth seed le asigna un UUID fijo
      dni: dniSeed,
      nombre: 'Paciente',
      apellido: 'Prueba',
      estado: EstadoPaciente.ACTIVO, // Asegurate que coincida con tu enum
      altaPor: AltaPor.AUTORREGISTRO, // Asegurate que coincida con tu enum
      numeroPaciente: nuevoNumero,
    });

    await pacienteRepo.save(pacienteSeed);
    console.log(`[Seed] Paciente ${emailSeed} creado correctamente con éxito.`);
  } else {
    console.log(
      `[Seed] El paciente para ${emailSeed} ya se encuentra registrado.`,
    );
  }
}
