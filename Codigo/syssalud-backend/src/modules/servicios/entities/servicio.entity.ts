import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ServicioProfesional } from './servicio-profesional.entity';

/**
 * Entidad Servicio — CUU10: Mantener catálogo de servicios.
 * Representa un servicio médico estético/cirugía plástica con duración y precio definidos.
 *
 * Diccionario de datos CUU10: serv = id_serv + nom_serv + desc_serv + duracion_serv + precio_serv + 1{id_prof}n
 * RN03: un turno está constituido por un servicio específico.
 */
@Entity('servicios')
export class Servicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', name: 'duracion_min' })
  duracionMin: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  precio: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;

  @OneToMany(() => ServicioProfesional, sp => sp.servicio)
  servicioProfesionales: ServicioProfesional[];

  // Virtual: profesionales asociados (se llena mediante service, no directamente de DB)
  profesionales?: Array<{ id: string; nombreCompleto: string | null; activo: boolean | null }>;
}