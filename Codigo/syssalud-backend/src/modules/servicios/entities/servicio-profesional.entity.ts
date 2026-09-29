// syssalud-backend/src/modules/servicios/entities/servicio-profesional.entity.ts
import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Servicio } from './servicio.entity';

/**
 * Tabla intermedia para asociación muchos-a-muchos entre Servicio y Profesionales.
 * Los profesional_id son UUID opacos (sin FK física a otro módulo — SER-007).
 */
@Entity('servicio_profesionales')
export class ServicioProfesional {
  @PrimaryColumn('uuid', { name: 'servicio_id' })
  servicioId: string;

  @PrimaryColumn('uuid', { name: 'profesional_id' })
  profesionalId: string;

  @ManyToOne(() => Servicio)
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;
}