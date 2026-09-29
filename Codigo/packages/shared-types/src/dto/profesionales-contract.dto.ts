/**
 * Contrato de la costura con módulo Profesionales
 *
 * SER-011: Define la forma que GET /api/profesionales?ids= debe retornar
 * Fixture incluido para pruebas y documentación
 */

export interface ProfesionalResumen {
  id: string;
  nombreCompleto: string | null;
  activo: boolean | null;
}

export const profesionalResumenFixture: ProfesionalResumen[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    nombreCompleto: 'Dr. Juan Pérez',
    activo: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    nombreCompleto: 'Dra. María González',
    activo: true,
  },
];