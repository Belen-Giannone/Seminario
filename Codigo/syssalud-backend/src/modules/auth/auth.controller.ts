import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

/**
 * Controlador para gestionar las peticiones HTTP relacionadas con la seguridad y acceso (IAM).
 * Punto de entrada base: `/api/auth`
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint público para iniciar sesión en SysSalud.
   * @route POST /api/auth/login
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Ruta de prueba protegida por Rol
  /**
   * Endpoint protegido de prueba reservado únicamente para el perfil de Asistente Administrativa.
   * @route GET /api/auth/admin-only
   * @security Requiere Token JWT de un usuario con rol 'ADMINISTRATIVO'.
   */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATIVO')
  getAdminPanel() {
    return { message: 'Acceso concedido al Panel Administrativo de SysSalud' };
  }
}