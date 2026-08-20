import { Rol } from '@syssalud/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Identidad y credenciales de un usuario del sistema (RN01, RN04, RN05).
 *
 * Nota de arquitectura: esta entidad vive en el módulo Auth y solo contiene lo
 * necesario para autenticar (credenciales + datos mínimos de perfil). El módulo
 * "Pacientes" puede más adelante tener su propia entidad `Paciente` con datos
 * clínicos/de negocio, referenciando este `Usuario` por id — no duplicar lógica
 * de login ahí.
 */
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Index({ unique: true, where: '"dni" IS NOT NULL' })
  @Column({ nullable: true })
  dni: string | null;

  @Column({ type: 'enum', enum: Rol, default: Rol.PACIENTE })
  rol: Rol;

  @Column({ nullable: true })
  telefono: string | null;

  @Column({ nullable: true })
  domicilio: string | null;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: string | null;

  @CreateDateColumn()
  creadoEn: Date;

  @UpdateDateColumn()
  actualizadoEn: Date;
}
