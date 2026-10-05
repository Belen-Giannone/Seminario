import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import type { EntradaCreadaResponse } from '@syssalud/shared-types';
import { Roles } from '../../shared/decorators/roles.decorator';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { BuscarHistoriaDto } from './dto/buscar-historia.dto';
import { CrearEntradaDto } from './dto/crear-entrada.dto';
import { HistoriaClinicaService } from './historia-clinica.service';

/**
 * CUU09 - Gestionar historia clínica. Acceso exclusivo del Profesional (RN10,
 * HCL-019): todos los endpoints, `_estado` incluido, exigen `Rol.PROFESIONAL`.
 * El JWT del profesional se reenvía a las costuras de Pacientes y Turnos.
 */
@Controller('historia-clinica')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.PROFESIONAL)
export class HistoriaClinicaController {
  constructor(
    private readonly historiaClinicaService: HistoriaClinicaService,
  ) {}

  /** HCL-004 */
  @Get('_estado')
  estado() {
    return this.historiaClinicaService.estado();
  }

  /** HCL-012 */
  @Get()
  buscar(
    @Query() query: BuscarHistoriaDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.historiaClinicaService.buscar(
      query,
      request.user.sub,
      request.headers.authorization,
    );
  }

  /** HCL-013 */
  @Get(':pacienteId')
  obtener(
    @Param('pacienteId', ParseUUIDPipe) pacienteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.historiaClinicaService.obtener(
      pacienteId,
      request.user.sub,
      request.headers.authorization,
    );
  }

  /** HCL-014 */
  @Post(':pacienteId')
  @HttpCode(HttpStatus.CREATED)
  inicializar(
    @Param('pacienteId', ParseUUIDPipe) pacienteId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.historiaClinicaService.inicializar(
      pacienteId,
      request.user.sub,
      request.headers.authorization,
    );
  }

  /** HCL-015 */
  @Post(':pacienteId/entradas')
  @HttpCode(HttpStatus.CREATED)
  async agregarEntrada(
    @Param('pacienteId', ParseUUIDPipe) pacienteId: string,
    @Body() dto: CrearEntradaDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<EntradaCreadaResponse> {
    const entrada = await this.historiaClinicaService.agregarEntrada(
      pacienteId,
      request.user.sub,
      dto,
      request.headers.authorization,
    );
    return {
      mensaje: 'Historia clínica actualizada correctamente.',
      entrada,
    };
  }
}
