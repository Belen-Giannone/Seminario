import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity'; // ajustá el path real
import { HorarioAtencion } from '../../profesionales/entities/horario-atencion.entity';

/**
 * Datos de negocio de un profesional (especialidad, matrícula, horarios).
 * Vive separado de `Usuario` (que solo tiene credenciales) — mismo criterio
 * que se documentó para Pacientes en usuario.entity.ts.
 */
@Entity('profesionales')
export class Profesional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  usuarioId: string;

  @OneToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column()
  especialidad: string;

  @Column({ nullable: true })
  matricula: string | null;

  @OneToMany(() => HorarioAtencion, (horario) => horario.profesional)
  horarios: HorarioAtencion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
