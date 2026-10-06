import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
import { ProfesionalesService } from './profesionales.service';
import { CrearProfesionalDto } from './dto/crear-profesional.dto';
import { DefinirHorariosDto } from './dto/definir-horarios.dto';
import { ActualizarProfesionalDto } from './dto/actualizar-profesional.dto';

@Controller('profesionales')
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  /** PRO-004 */
  @Get('_estado')
  estado() {
    return this.profesionalesService.estado();
  }

  /** PRO-018 — declarada antes de `:id` para que no la capture esa ruta. */
  @UseGuards(JwtAuthGuard)
  @Get('por-usuario/:usuarioId')
  porUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.profesionalesService.porUsuario(usuarioId);
  }

  /** PRO-012 — alta en un paso. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.DUENO)
  @Post()
  crear(@Body() dto: CrearProfesionalDto) {
    return this.profesionalesService.crear(dto);
  }

  /** PRO-013 — `?ids=a,b,c` (costura de Servicios) y `?activos=true`. */
  @UseGuards(JwtAuthGuard)
  @Get()
  listar(@Query('ids') ids?: string, @Query('activos') activos?: string) {
    return this.profesionalesService.listar({
      ids: ids ? ids.split(',').filter(Boolean) : undefined,
      activos: activos === undefined ? undefined : activos === 'true',
    });
  }

  /** PRO-014 */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.profesionalesService.buscarPorId(id);
  }

  /** PRO-015 — costura entrante de Agenda. */
  @UseGuards(JwtAuthGuard)
  @Get(':id/horarios')
  horariosDe(@Param('id', ParseUUIDPipe) id: string) {
    return this.profesionalesService.horariosDe(id);
  }

  /** PRO-016 — reemplaza el set completo. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.DUENO, Rol.PROFESIONAL)
  @Put(':id/horarios')
  definirHorarios(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefinirHorariosDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.profesionalesService.definirHorarios(id, dto, {
      sub: req.user.sub,
      rol: req.user.rol,
    });
  }

  /** PRO-017 — edición y baja lógica. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.DUENO)
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarProfesionalDto,
  ) {
    return this.profesionalesService.actualizar(id, dto);
  }
}
