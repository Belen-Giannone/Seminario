import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DiaSemana } from '@syssalud/shared-types';
import { Repository } from 'typeorm';
import { CrearHorarioDto } from './dto/crear-horario.dto';
import { CrearProfesionalDto } from './dto/crear-profesional.dto';
import { HorarioAtencion } from './entities/horario-atencion.entity';
import { Profesional } from './entities/profesional.entity';

/**
 * TODO (Pareja B): entidad `Profesional` (especialidad, horarios de atención).
 * - Exponer método público (ej. `horariosDe(profesionalId, fecha)`) para que
 *   el módulo Agenda calcule disponibilidad sin tocar esta entidad directamente.
 */
@Injectable()
export class ProfesionalesService {
  constructor(
    @InjectRepository(Profesional)
    private readonly profesionalesRepo: Repository<Profesional>,
    @InjectRepository(HorarioAtencion)
    private readonly horariosRepo: Repository<HorarioAtencion>,
  ) {}

  estado() {
    return {
      modulo: 'profesionales',
      estado: 'activo',
      cubre: ['soporte de Agenda'],
    };
  }

  async crear(dto: CrearProfesionalDto): Promise<Profesional> {
    const profesional = this.profesionalesRepo.create(dto);
    return this.profesionalesRepo.save(profesional);
  }

  async listar(): Promise<Profesional[]> {
    return this.profesionalesRepo.find({ relations: ['horarios'] });
  }

  async buscarPorId(id: string): Promise<Profesional> {
    const profesional = await this.profesionalesRepo.findOne({
      where: { id },
      relations: ['horarios'],
    });
    if (!profesional) throw new NotFoundException('Profesional no encontrado');
    return profesional;
  }

  async agregarHorario(
    profesionalId: string,
    dto: CrearHorarioDto,
  ): Promise<HorarioAtencion> {
    await this.buscarPorId(profesionalId); // valida que exista, tira 404 si no
    const horario = this.horariosRepo.create({ ...dto, profesionalId });
    return this.horariosRepo.save(horario);
  }

  /** Usado por Agenda para calcular disponibilidad. */
  async horariosDe(
    profesionalId: string,
    diaSemana?: DiaSemana,
  ): Promise<HorarioAtencion[]> {
    return this.horariosRepo.find({
      where: diaSemana ? { profesionalId, diaSemana } : { profesionalId },
    });
  }
}
