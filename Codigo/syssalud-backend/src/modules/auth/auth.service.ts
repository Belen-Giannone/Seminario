import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

/**
 * Servicio encargado de gestionar la lógica de negocio para la autenticación,
 * verificación de credenciales y generación de tokens de acceso en el sistema.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // Usuarios simulados para la etapa inicial
  /** Listado simulado de usuarios para pruebas iniciales del sistema */
  private readonly mockUsers = [
    { id: 1, email: 'paciente@syssalud.com', role: 'PACIENTE', nombre: 'Juan Pérez' },
    { id: 2, email: 'medico@syssalud.com', role: 'PROFESIONAL', nombre: 'Dra. María González' },
    { id: 3, email: 'admin@syssalud.com', role: 'ADMINISTRATIVO', nombre: 'Carlos Asistente' },
  ];

  /**
   * Autentica a un usuario según sus credenciales y genera un Token JWT.
   * 
   * @param loginDto Datos con correo y contraseña.
   * @returns Promesa con el mensaje de confirmación, token de acceso y perfil básico del usuario.
   * @throws {UnauthorizedException} Si el email no existe o la contraseña es incorrecta.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = this.mockUsers.find((u) => u.email === email);
    if (!user || password !== '123456') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Payload que se codifica dentro del JWT Token para validaciones posteriores
    const payload = { sub: user.id, email: user.email, role: user.role, nombre: user.nombre };

    return {
      message: 'Inicio de sesión exitoso',
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role, nombre: user.nombre },
    };
  }
}