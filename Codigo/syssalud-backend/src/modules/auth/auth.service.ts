import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthResponse, Rol, UsuarioPerfil } from '@syssalud/shared-types';
import { Usuario } from './entities/usuario.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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

  /** Login unificado para los cuatro roles del sistema (RN04, RN05). */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const usuario = await this.usuarios.findOne({ where: { email: dto.email } });
    if (!usuario || !(await bcrypt.compare(dto.password, usuario.passwordHash))) {
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
