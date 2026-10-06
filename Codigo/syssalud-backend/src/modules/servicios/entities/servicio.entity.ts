import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { ServicioProfesional } from './servicio-profesional.entity';

/** `pg` devuelve las columnas `decimal` como string: se exponen como number (SER-006). */
const decimalComoNumero: ValueTransformer = {
  to: (valor?: number | null) => valor,
  from: (valor?: string | null) =>
    valor === null || valor === undefined ? valor : Number(valor),
};

/**
 * Entidad Servicio — CUU10: Mantener catálogo de servicios (SER-006).
 * Diccionario: `serv = id_serv + nom_serv + desc_serv + duracion_serv + precio_serv + 1{id_prof}n`.
 * RN03: un turno está constituido por un servicio específico.
 */
@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Único sin distinguir mayúsculas: lo valida el service (SER-025); el índice es la última barrera. */
  @Column({ type: 'varchar', length: 200, unique: true })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', name: 'duracion_min' })
  duracionMin: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalComoNumero,
  })
  precio: number;

  /** Baja lógica (SER-009): los turnos históricos y las métricas siguen referenciándolo. */
  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(() => ServicioProfesional, (sp) => sp.servicio)
  servicioProfesionales: ServicioProfesional[];
}
