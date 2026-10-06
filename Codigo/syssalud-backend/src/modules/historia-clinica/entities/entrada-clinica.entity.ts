import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HistoriaClinica } from './historia-clinica.entity';

@Entity('entradas_clinicas')
@Index(['historiaId', 'fecha'])
export class EntradaClinica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  historiaId: string;

  @ManyToOne(() => HistoriaClinica, (historia) => historia.entradas, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'historiaId' })
  historia: HistoriaClinica;

  @Column({ type: 'uuid', nullable: true })
  turnoId: string | null;

  @Column({ type: 'uuid' })
  profesionalId: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'text', default: '' })
  observaciones: string;

  @Column({ type: 'text', default: '' })
  tratamientos: string;

  @Column({ type: 'text', default: '' })
  antecedentes: string;

  @CreateDateColumn()
  fechaActualizacion: Date;
}
