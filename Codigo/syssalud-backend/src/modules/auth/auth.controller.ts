import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard, AuthenticatedRequest } from '../../shared/guards/jwt-auth.guard';

/**
 * Controlador para gestionar las peticiones HTTP relacionadas con la seguridad y acceso (IAM).
 * Punto de entrada base: `/api/auth`
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * CUU01 - Registrar paciente (autorregistro).
   * @route POST /api/auth/register
   */
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Endpoint público para iniciar sesión en SysSalud.
   * @route POST /api/auth/login
   */
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Devuelve el perfil del usuario autenticado a partir del token vigente.
   * Lo usa el frontend para restaurar la sesión al recargar la página.
   * @route GET /api/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.perfilDesdeToken(req.user!.sub);
  }
}
