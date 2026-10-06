import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Servicio } from './servicio.entity';

/**
 * Asociación `1{id_prof}n` de un servicio (SER-007). `profesional_id` es un
 * UUID opaco: sin FK a Profesionales; su existencia la valida la costura.
 */
@Entity('servicio_profesionales')
export class ServicioProfesional {
  @PrimaryColumn('uuid', { name: 'servicio_id' })
  servicioId: string;

  /** Indexado para responder "servicios de un profesional" sin acoplar módulos. */
  @Index()
  @PrimaryColumn('uuid', { name: 'profesional_id' })
  profesionalId: string;

  @ManyToOne(() => Servicio, (servicio) => servicio.servicioProfesionales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;
}
