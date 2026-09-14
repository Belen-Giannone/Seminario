import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoPaciente, AltaPor } from '@syssalud/shared-types';

@Entity('pacientes')
export class Paciente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  usuarioId: string | null;

  @Column({ type: 'int', unique: true })
  numeroPaciente: number;

  @Column({
    type: 'enum',
    enum: EstadoPaciente,
    default: EstadoPaciente.PENDIENTE_CREDENCIALES,
  })
  estado: EstadoPaciente;

  @Column({ type: 'enum', enum: AltaPor })
  altaPor: AltaPor;

  @Index()
  @Column({ type: 'varchar', length: 8 })
  dni: string;

  @Index()
  @Column({ type: 'varchar', length: 120 })
  apellido: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @CreateDateColumn({ name: 'fecha_alta' })
  fechaAlta: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
