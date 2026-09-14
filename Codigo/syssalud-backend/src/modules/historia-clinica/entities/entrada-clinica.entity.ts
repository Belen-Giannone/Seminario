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

  @Column()
  historiaId: string;

  @ManyToOne(() => HistoriaClinica, (historia) => historia.entradas, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'historiaId' })
  historia: HistoriaClinica;

  @Column({ nullable: true })
  turnoId: string | null;

  @Column()
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