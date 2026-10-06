import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HorarioAtencion } from './horario-atencion.entity';

/**
 * Datos de negocio de un profesional (especialidad, matrícula, horarios).
 * `usuarioId` es un uuid opaco a `Usuario` (Auth) — PRO-001: sin relación
 * TypeORM cruzando módulos, sólo costura vía `AuthClient`. Nombre/email/dni
 * viven en `Usuario` y se resuelven por esa costura (PRO-006).
 */
@Entity('profesionales')
export class Profesional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nullable mientras Auth está caído al momento del alta (PRO-002). */
  @Index({ unique: true, where: '"usuarioId" IS NOT NULL' })
  @Column({ type: 'uuid', nullable: true })
  usuarioId: string | null;

  @Column()
  especialidad: string;

  @Index({ unique: true })
  @Column()
  matricula: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => HorarioAtencion, (horario) => horario.profesional)
  horarios: HorarioAtencion[];

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
