// syssalud-backend/src/modules/servicios/servicios.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ServiciosService } from './servicios.service';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';
import { ServicioResumen, Rol } from '@syssalud/shared-types';
import { Roles } from '../../shared/decorators/roles.decorator';

/**
 * Controlador del módulo Servicios
 *
 * SER-013..SER-020: Endpoints CRUD y _estado
 * SER-029: RBAC por endpoint
 * Cuu10: Mantenimiento de catálogo por Asistente Administrativo
 */
@Controller('servicios')
export class ServiciosController {
  constructor(private serviciosService: ServiciosService) {}

  /**
   * SER-020: Endpoint de estado/readiness
   * Público o autenticado sin rol específico
   */
  @Get('_estado')
  async estado() {
    return this.serviciosService.estado();
  }

  /**
   * SER-015: Listado de servicios
   * Lectura accesible a cualquier usuario autenticado (pacientes necesitan ver catálogo)
   */
  @Get()
  async listar(@Query('soloActivos') soloActivosStr?: string): Promise<ServicioResumen[]> {
    const soloActivos = soloActivosStr !== 'false';
    return this.serviciosService.listar(soloActivos);
  }

  /**
   * SER-014: Alta de servicio
   * Solo Asistente (y Dueño si se confirma)
   */
  @Post()
  @Roles(Rol.ASISTENTE)
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() dto: CrearServicioDto) {
    return this.serviciosService.crear(dto);
  }

  /**
   * SER-016: Detalle de servicio
   */
  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.serviciosService.obtenerPorId(id);
  }

  /**
   * SER-017: Profesionales del servicio
   */
  @Get(':id/profesionales')
  async obtenerProfesionales(@Param('id') id: string) {
    return this.serviciosService.obtenerProfesionales(id);
  }

  /**
   * SER-018: Modificación parcial
   */
  @Patch(':id')
  @Roles(Rol.ASISTENTE)
  async actualizar(@Param('id') id: string, @Body() dto: ActualizarServicioDto) {
    return this.serviciosService.actualizar(id, dto);
  }

  /**
   * SER-019: Baja lógica
   */
  @Delete(':id')
  @Roles(Rol.ASISTENTE)
  @HttpCode(HttpStatus.NO_CONTENT)

  async eliminar(@Param('id') id: string) {
    await this.serviciosService.eliminar(id);
  }
}