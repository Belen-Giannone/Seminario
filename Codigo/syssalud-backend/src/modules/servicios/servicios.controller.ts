import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { Roles } from '../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ServiciosService } from './servicios.service';

/**
 * CUU10 — Mantener catálogo de servicios. RBAC (SER-029): lectura para
 * cualquier usuario autenticado (el paciente ve el catálogo al reservar);
 * escritura sólo para ASISTENTE; `_estado` público.
 */
@Controller('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  /** SER-005 / SER-020 */
  @Get('_estado')
  estado() {
    return this.serviciosService.estado();
  }

  /** SER-015: `?soloActivos=false` incluye los dados de baja. */
  @Get()
  @UseGuards(JwtAuthGuard)
  listar(
    @Query('soloActivos', new DefaultValuePipe(true), ParseBoolPipe)
    soloActivos: boolean,
  ) {
    return this.serviciosService.listar(soloActivos);
  }

  /** SER-016 */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviciosService.obtener(id);
  }

  /** SER-017 */
  @Get(':id/profesionales')
  @UseGuards(JwtAuthGuard)
  profesionales(@Param('id', ParseUUIDPipe) id: string) {
    return this.serviciosService.profesionalesDe(id);
  }

  /** SER-014 */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE)
  crear(@Body() dto: CrearServicioDto) {
    return this.serviciosService.crear(dto);
  }

  /** SER-018 */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE)
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarServicioDto,
  ) {
    return this.serviciosService.actualizar(id, dto);
  }

  /** SER-019: baja lógica. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async darDeBaja(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.serviciosService.darDeBaja(id);
  }
}
