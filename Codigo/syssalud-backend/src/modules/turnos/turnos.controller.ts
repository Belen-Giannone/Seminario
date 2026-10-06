import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { TurnosService } from './turnos.service';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';
import { PagarTurnoDto } from './dto/pagar-turno.dto';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto';
import { CancelarTurnoDto } from './dto/cancelar-turno.dto';
import { ListarTurnosQueryDto } from './dto/listar-turnos-query.dto';

@Controller('turnos')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  /** TUR-004 */
  @Get('_estado')
  estado() {
    return this.turnosService.estado();
  }

  /** TUR-013 — CUU02 pasos 3-4. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE, Rol.ASISTENTE)
  @Post()
  solicitar(@Body() dto: SolicitarTurnoDto, @Req() req: AuthenticatedRequest) {
    return this.turnosService.solicitar(dto, {
      sub: req.user!.sub,
      rol: req.user!.rol,
    });
  }

  /** TUR-020 — atajo del paciente. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE)
  @Get('mis-turnos')
  misTurnos(@Req() req: AuthenticatedRequest) {
    return this.turnosService.misTurnos({ sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-015. */
  @UseGuards(JwtAuthGuard)
  @Get()
  listar(@Query() query: ListarTurnosQueryDto, @Req() req: AuthenticatedRequest) {
    return this.turnosService.listar(query, { sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-016. */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtener(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.turnosService.obtener(id, { sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-014 — CUU02 paso 5. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE, Rol.ASISTENTE)
  @Post(':id/pago')
  pagar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PagarTurnoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.turnosService.pagar(id, dto, { sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-017 — CUU03. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE, Rol.ASISTENTE)
  @Post(':id/cancelar')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelarTurnoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.turnosService.cancelar(id, dto, { sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-018 — CUU04. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PACIENTE, Rol.ASISTENTE)
  @Post(':id/reprogramar')
  reprogramar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprogramarTurnoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.turnosService.reprogramar(id, dto, { sub: req.user!.sub, rol: req.user!.rol });
  }

  /** TUR-019. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.PROFESIONAL, Rol.ASISTENTE)
  @Post(':id/asistencia')
  marcarAsistencia(@Param('id', ParseUUIDPipe) id: string) {
    return this.turnosService.marcarAsistencia(id);
  }
}
