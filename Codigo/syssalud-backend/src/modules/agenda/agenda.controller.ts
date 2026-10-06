import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { AgendaService } from './agenda.service';
import { ConsultarAgendaQueryDto } from './dto/consultar-agenda.dto';
import { DisponibilidadQueryDto } from './dto/disponibilidad.dto';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

/**
 * Controlador de Agenda — CUU05 (Consultar agenda). Punto de entrada base: `/api/agenda`.
 * AGE-005: el módulo no tiene entidad propia; toda respuesta se recalcula on-demand
 * a partir de las costuras REST con Profesionales, Turnos, Servicios y Feriados.
 */
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  /** Readiness de las costuras (AGE-004). */
  @Get('_estado')
  estado() {
    return this.agendaService.estado();
  }

  /** Atajo del profesional autenticado para su propia agenda (AGE-014). */
  @Get('mi-agenda')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PROFESIONAL)
  miAgenda(
    @Req() req: AuthenticatedRequest,
    @Query() query: ConsultarAgendaQueryDto,
  ) {
    return this.agendaService.agendaDe(req.user.sub, query, req.user);
  }

  /**
   * CUU05 - Consultar agenda de un profesional: fecha, hora, paciente y servicio.
   * `PROFESIONAL` sólo ve la propia (se ignora `:profesionalId` y se usa su `sub`);
   * `ASISTENTE` puede consultar cualquiera. Alt. 1.a sin turnos, 1.b profesional inexistente.
   * @route GET /api/agenda/:profesionalId
   */
  @Get(':profesionalId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PROFESIONAL, Rol.ASISTENTE)
  agendaDe(
    @Param('profesionalId') profesionalId: string,
    @Query() query: ConsultarAgendaQueryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.agendaService.agendaDe(profesionalId, query, req.user);
  }

  /**
   * Slots libres para agendar un turno (RN07, RN08, RN09, RN19). Lo consumen
   * Turnos (CUU02/CUU04) antes de reservar/reprogramar, y el Frontend.
   * @route GET /api/agenda/:profesionalId/disponibilidad
   */
  @Get(':profesionalId/disponibilidad')
  @UseGuards(JwtAuthGuard)
  disponibilidad(
    @Param('profesionalId') profesionalId: string,
    @Query() query: DisponibilidadQueryDto,
  ) {
    return this.agendaService.disponibilidad(profesionalId, query);
  }
}
