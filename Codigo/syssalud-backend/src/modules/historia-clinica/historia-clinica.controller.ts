import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { HistoriaClinicaService } from './historia-clinica.service';

@Controller('historia-clinica')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.PROFESIONAL)
export class HistoriaClinicaController {
  constructor(private readonly historiaClinicaService: HistoriaClinicaService) {}

  @Get('_estado')
  estado() {
    return this.historiaClinicaService.estado();
  }

  @Get()
  buscar(@Query('buscar') criterio: string) {
    return this.historiaClinicaService.buscar(criterio);
  }

  @Get(':pacienteId')
  obtener(@Param('pacienteId') pacienteId: string) {
    return this.historiaClinicaService.obtener(pacienteId);
  }

  @Post(':pacienteId')
  @HttpCode(HttpStatus.CREATED)
  inicializar(@Param('pacienteId') pacienteId: string) {
    return this.historiaClinicaService.inicializar(pacienteId);
  }

  @Post(':pacienteId/entradas')
  @HttpCode(HttpStatus.CREATED)
  async agregarEntrada(
    @Param('pacienteId') pacienteId: string,
    @Body() dto: { observaciones: string; antecedentes: string; tratamientos: string; turnoId?: string },
    @Req() request: AuthenticatedRequest,
  ) {
    const entrada = await this.historiaClinicaService.agregarEntrada(
      pacienteId,
      request.user!.sub,
      dto,
    );
    return {
      mensaje: 'Historia clínica actualizada correctamente.',
      entrada,
    };
  }
}
