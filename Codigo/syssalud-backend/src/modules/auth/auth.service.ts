import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { AuthResponse, Rol, UsuarioPerfil } from '@syssalud/shared-types';
import { Usuario } from './entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface UsuarioResumen {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
}

export interface UsuarioCreado extends UsuarioResumen {
  passwordInicial: string;
}

/**
 * Lógica de negocio de autenticación (CUU01 autorregistro, login) y emisión
 * de JWT para el resto del sistema.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  /** CUU01 - camino alternativo 2.a: el paciente se registra por sí mismo. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existente = await this.usuarios.findOne({
      where: [{ email: dto.email }, { dni: dto.dni }],
    });
    if (existente) {
      // CUU01 3.a - El paciente ya está registrado
      throw new ConflictException(
        'Ya existe un usuario registrado con ese email o DNI',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.usuarios.save(
      this.usuarios.create({
        nombre: dto.nombre,
        apellido: dto.apellido,
        dni: dto.dni,
        fechaNacimiento: dto.fechaNacimiento,
        telefono: dto.telefono,
        domicilio: dto.domicilio,
        email: dto.email,
        passwordHash,
        rol: Rol.PACIENTE,
      }),
    );

    return this.emitirSesion(usuario);
  }

  /**
   * Crea un usuario desde otro módulo interno (hoy: Pacientes, alta por
   * asistente). No es un endpoint HTTP: se usa en el mismo proceso, ya que
   * todavía no existe un servicio de Auth separado.
   */
  async crearUsuarioInterno(datos: {
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    telefono: string;
    email: string;
    domicilio: string;
    rol: Rol;
  }): Promise<UsuarioCreado> {
    const existente = await this.usuarios.findOne({
      where: [{ email: datos.email }, { dni: datos.dni }],
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese email o DNI',
      );
    }

    const passwordInicial = randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(passwordInicial, 10);
    const usuario = await this.usuarios.save(
      this.usuarios.create({ ...datos, passwordHash }),
    );

    return { ...this.aResumen(usuario), passwordInicial };
  }

  /** Resuelve varios usuarios por id para otros módulos internos. */
  async obtenerResumenesPorIds(ids: string[]): Promise<UsuarioResumen[]> {
    if (ids.length === 0) return [];
    const usuarios = await this.usuarios.findBy({ id: In(ids) });
    return usuarios.map((usuario) => this.aResumen(usuario));
  }

  /** Actualiza datos de contacto de un usuario desde otro módulo interno. */
  async actualizarContactoInterno(
    usuarioId: string,
    datos: Partial<Pick<UsuarioResumen, 'telefono' | 'email' | 'domicilio'>>,
  ): Promise<boolean> {
    const usuario = await this.usuarios.findOne({ where: { id: usuarioId } });
    if (!usuario) return false;
    Object.assign(usuario, datos);
    await this.usuarios.save(usuario);
    return true;
  }

  /** Login unificado para los cuatro roles del sistema (RN04, RN05). */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const usuario = await this.usuarios.findOne({
      where: { email: dto.email },
    });
    if (
      !usuario ||
      !(await bcrypt.compare(dto.password, usuario.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.emitirSesion(usuario);
  }

  /** Recupera el perfil actualizado a partir del payload del JWT (GET /auth/me). */
  async perfilDesdeToken(usuarioId: string): Promise<UsuarioPerfil> {
    const usuario = await this.usuarios.findOne({ where: { id: usuarioId } });
    if (!usuario) {
      throw new UnauthorizedException('El usuario ya no existe');
    }
    return this.aPerfil(usuario);
  }

  private async emitirSesion(usuario: Usuario): Promise<AuthResponse> {
    const perfil = this.aPerfil(usuario);
    const accessToken = await this.jwtService.signAsync({
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
    });
    return { accessToken, usuario: perfil };
  }

  private aResumen(usuario: Usuario): UsuarioResumen {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni ?? '',
      fechaNacimiento: usuario.fechaNacimiento ?? '',
      telefono: usuario.telefono ?? '',
      email: usuario.email,
      domicilio: usuario.domicilio ?? '',
    };
  }

  private aPerfil(usuario: Usuario): UsuarioPerfil {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      rol: usuario.rol,
      dni: usuario.dni,
      telefono: usuario.telefono,
      domicilio: usuario.domicilio,
      fechaNacimiento: usuario.fechaNacimiento,
    };
  }
}
