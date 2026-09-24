import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@syssalud/shared-types';
import { Roles } from '../../shared/decorators/roles.decorator'; // ajustá el path real
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CrearHorarioDto } from './dto/crear-horario.dto';
import { CrearProfesionalDto } from './dto/crear-profesional.dto';
import { ProfesionalesService } from './profesionales.service';

@Controller('profesionales')
export class ProfesionalesController {
  constructor(private readonly profesionalesService: ProfesionalesService) {}

  @Get()
  estado() {
    return this.profesionalesService.estado();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.DUENO)
  @Post()
  crear(@Body() dto: CrearProfesionalDto) {
    return this.profesionalesService.crear(dto);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.profesionalesService.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ASISTENTE, Rol.DUENO, Rol.PROFESIONAL)
  @Post(':id/horarios')
  agregarHorario(@Param('id') id: string, @Body() dto: CrearHorarioDto) {
    return this.profesionalesService.agregarHorario(id, dto);
  }
}
