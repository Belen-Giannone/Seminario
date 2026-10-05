import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { PacientesService } from './pacientes.service';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { AltaPerfilPacienteDto } from './dto/alta-perfil-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';

@Controller('pacientes')
export class PacientesController {
  constructor(private readonly pacientesService: PacientesService) {}

  /** PAC-004 / PAC-019 */
  @Get('_estado')
  estado() {
    return this.pacientesService.estado();
  }

  /** PAC-012 — CUU01 camino básico */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE)
  @Post()
  registrar(@Body() dto: CrearPacienteDto) {
    return this.pacientesService.registrarPorAsistente(dto);
  }

  /** PAC-013 — costura inversa desde Auth */
  @Post('perfil')
  registrarPerfil(@Body() dto: AltaPerfilPacienteDto) {
    return this.pacientesService.registrarDesdeAutorregistro(dto);
  }

  /** PAC-014 — buscador */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.PROFESIONAL)
  @Get()
  buscar(
    @Query('buscar') buscar?: string,
    @Query('pagina') pagina?: string,
    @Query('porPagina') porPagina?: string,
  ) {
    return this.pacientesService.buscar({
      buscar,
      pagina: pagina ? Number(pagina) : undefined,
      porPagina: porPagina ? Number(porPagina) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('por-usuario/:usuarioId')
  obtenerPorUsuario(@Param('usuarioId') usuarioId: string) {
    return this.pacientesService.obtenerPorUsuarioId(usuarioId);
  }

  /** PAC-018 — RN06, la consume Turnos */
  @UseGuards(JwtAuthGuard)
  @Get(':id/registrado')
  verificarRegistrado(@Param('id') id: string) {
    return this.pacientesService.verificarRegistrado(id);
  }

  /** PAC-015 — detalle */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtenerPorId(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.pacientesService.obtenerPorId(id, {
      sub: req.user!.sub,
      rol: req.user!.rol,
    });
  }

  /** PAC-017 — edición */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarPacienteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.pacientesService.actualizar(id, dto, {
      sub: req.user!.sub,
      rol: req.user!.rol,
    });
  }
}
