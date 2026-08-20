import { Injectable } from '@nestjs/common';

/**
 * TODO (Pareja A): CUU09 - Gestionar historia clínica.
 * - Entidad `HistoriaClinica` (RN02, RN10): solo Profesional lee/escribe.
 * - Proteger los endpoints con @Roles(Rol.PROFESIONAL) + RolesGuard.
 */
@Injectable()
export class HistoriaClinicaService {
  estado() {
    return { modulo: 'historia-clinica', estado: 'pendiente', cubre: ['CUU09'] };
  }
}
