import { Rol } from '@syssalud/shared-types';

export const ETIQUETA_ROL: Record<Rol, string> = {
  [Rol.PACIENTE]: 'Paciente',
  [Rol.ASISTENTE]: 'Asistente administrativo',
  [Rol.PROFESIONAL]: 'Profesional médico',
  [Rol.DUENO]: 'Dueño del centro',
};
