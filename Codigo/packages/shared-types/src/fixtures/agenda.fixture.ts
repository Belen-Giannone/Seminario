import { AgendaProfesional } from '../dto/agenda.dto';

/** Fixture de ejemplo para tests de la costura de Agenda (AGE-011). */
export const agendaProfesionalFixture: AgendaProfesional = {
  idProf: '11111111-1111-1111-1111-111111111111',
  profesionalNombre: 'Carlos Bilardo',
  periodo: { desde: '2026-09-14', hasta: '2026-09-18', tipo: 'semana' },
  items: [
    {
      idTurno: '22222222-2222-2222-2222-222222222222',
      fecha: '2026-09-15',
      hora: '09:00',
      pacienteNombre: 'Dolores Campos',
      servicioNombre: 'Consulta clínica',
      estado: 'CONFIRMADO',
    },
  ],
  ocupacionParcial: false,
};
