import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EstadoTurno } from '@syssalud/shared-types';

/**
 * TUR-006. `pacienteId`/`profesionalId`/`servicioId` son uuids opacos sin
 * `@ManyToOne` hacia otros módulos (TUR-001: sin acoplamiento en proceso).
 */
@Entity('turnos')
@Index(['profesionalId', 'fecha'])
@Index(['pacienteId', 'fecha'])
export class Turno {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pacienteId: string;

  @Column({ type: 'uuid' })
  profesionalId: string;

  @Column({ type: 'uuid' })
  servicioId: string;

  @Column({ type: 'date' })
  fecha: string;

  /** `HH:mm` */
  @Column({ type: 'varchar', length: 5 })
  hora: string;

  @Index()
  @Column({ type: 'enum', enum: EstadoTurno, default: EstadoTurno.SOLICITADO })
  estado: EstadoTurno;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'uuid', nullable: true })
  pagoId: string | null;

  @Column({ type: 'varchar', nullable: true })
  comprobanteNumero: string | null;

  /** TUR-008: vencido el plazo, la reserva `SOLICITADO` se da por `NO_CONFIRMADO`. */
  @Column({ type: 'timestamp', nullable: true })
  reservaExpiraEn: Date | null;

  /** `sub` del usuario autenticado que creó el turno (paciente o asistente). */
  @Column({ type: 'uuid' })
  creadoPor: string;

  @Column({ type: 'varchar', length: 10 })
  origen: 'PACIENTE' | 'ASISTENTE';

  @Column({ type: 'varchar', nullable: true })
  motivoCancelacion: string | null;

  /** TUR-049: clave de idempotencia del pago. */
  @Index({ unique: true, where: '"idTransaccion" IS NOT NULL' })
  @Column({ type: 'varchar', nullable: true })
  idTransaccion: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
