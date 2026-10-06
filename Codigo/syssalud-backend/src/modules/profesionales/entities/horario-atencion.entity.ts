import { DiaSemana } from '@syssalud/shared-types';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Profesional } from './profesional.entity';

/**
 * Franja horaria en la que un profesional atiende un día de la semana
 * (sólo lunes a viernes, RN07 — ver `DiaSemana`). Agenda, Turnos y Métricas
 * la consultan por la costura REST `GET /api/profesionales/:id/horarios`
 * (PRO-015), nunca inyectando `ProfesionalesService` (PRO-001/PRO-005).
 */
@Entity('horarios_atencion')
export class HorarioAtencion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
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
