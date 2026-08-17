import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Interfaz para extender la solicitud de Express e incluir el usuario autenticado.
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    sub: number;
    email: string;
    role: string;
    nombre: string;
  };
}

/**
 * Guard para validar la presencia y validez del token JWT en las peticiones HTTP.
 * Extrae el token de la cabecera 'Authorization' (Bearer token) y adjunta el payload decodificado
 * al objeto de la solicitud (`req.user`) si la firma es correcta.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Determina si la petición entrante tiene un token JWT válido.
   * @throws {UnauthorizedException} Si el token no está presente, expiró o no es válido.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'super_clave_secreta_syssalud_2026',
      });
      // Asignación tipada sin error de TypeScript
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    return true;
  }

  /** Extrae el token en formato Bearer desde las cabeceras HTTP */
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}