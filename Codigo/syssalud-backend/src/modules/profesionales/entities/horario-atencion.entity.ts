import { DiaSemana } from '@syssalud/shared-types';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Profesional } from './profesional.entity';

/**
 * Franja horaria en la que un profesional atiende un día de la semana.
 * Agenda consulta esto vía `ProfesionalesService.horariosDe(...)` — no
 * accede a esta tabla directamente (ver TODO original del módulo).
 */
@Entity('horarios_atencion')
export class HorarioAtencion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  profesionalId: string;

  @ManyToOne(() => Profesional, (profesional) => profesional.horarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'profesionalId' })
  profesional: Profesional;

  @Column({ type: 'enum', enum: DiaSemana })
  diaSemana: DiaSemana;

  @Column({ type: 'time' })
  horaInicio: string;

  @Column({ type: 'time' })
  horaFin: string;
}
