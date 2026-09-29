// syssalud-backend/src/modules/servicios/servicios.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicio } from './entities/servicio.entity';
import { ServicioProfesional } from './entities/servicio-profesional.entity';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';
import { ProfesionalesClient } from './clients/profesionales.client';

/**
 * Servicio para mantener catálogo de servicios — CUU10.
 *
 * @see SER-009 — Baja lógica (no borrado físico)
 * @see SER-023 — Validación delegada a costura Profesionales
 * @see SER-024 — Enriquecimiento best-effort de nombres
 */
@Injectable()
export class ServiciosService {
  private readonly logger = new Logger(ServiciosService.name);

  constructor(
    @InjectRepository(Servicio)
    private readonly servicioRepo: Repository<Servicio>,

    @InjectRepository(ServicioProfesional)
    private readonly servicioProfesionalRepo: Repository<ServicioProfesional>,

    private readonly profesionalesClient: ProfesionalesClient
  ) {}

  async crear(dto: CrearServicioDto): Promise<Servicio> {
    // SER-025: Nombre único (case-insensitive)
    const existente = await this.servicioRepo.findOne({
      where: { nombre: dto.nombre.toLowerCase() },
      relations: ['servicioProfesionales']
    });

    if (existente) {
      throw new ConflictException(`El servicio "${dto.nombre}" ya existe`);
    }

    // SER-023: Validar profesionalIds
    const validacion = await this.profesionalesClient.existenYSonProfesionales(dto.profesionalIds);

    if (validacion.invalidos.length > 0) {
      this.logger.warn(`Profesional IDs inválidos: ${validacion.invalidos.join(', ')}`);
    }

    const servicio = this.servicioRepo.create({
      ...dto,
      nombre: dto.nombre.trim(),
      profesionales: dto.profesionalIds.map(id => ({ id }))
    });

    const guardado = await this.servicioRepo.save(servicio);

    // Asociar profesionales
    const asociaciones = dto.profesionalIds.map(id =>
      this.servicioProfesionalRepo.create({ servicioId: guardado.id, profesionalId: id })
    );
    await this.servicioProfesionalRepo.save(asociaciones);

    // SER-024: Enriquecer con nombres
    const profesionales = await this.profesionalesClient.resumenPorIds(dto.profesionalIds);
    guardado.profesionales = profesionales;

    return guardado;
  }

  async listar(soloActivos: boolean = true): Promise<Servicio[]> {
    const servicios = await this.servicioRepo.find({
      where: soloActivos ? { activo: true } : undefined,
      order: { nombre: 'ASC' },
      relations: ['servicioProfesionales']
    });

    // SER-024: Enriquecer con nombres best-effort
    for (const servicio of servicios) {
      const ids = servicio.servicioProfesionales?.map(sp => sp.profesionalId) || [];
      if (ids.length > 0) {
        const profesionales = await this.profesionalesClient.resumenPorIds(ids);
        servicio.profesionales = profesionales;
      }
    }

    return servicios;
  }

  async obtenerPorId(id: string): Promise<Servicio> {
    const servicio = await this.servicioRepo.findOne({
      where: { id },
      relations: ['servicioProfesionales']
    });

    if (!servicio) {
      throw new NotFoundException(`Servicio con id "${id}" no encontrado`);
    }

    const ids = servicio.servicioProfesionales?.map(sp => sp.profesionalId) || [];
    if (ids.length > 0) {
      servicio.profesionales = await this.profesionalesClient.resumenPorIds(ids);
    }

    return servicio;
  }

  async obtenerProfesionales(id: string): Promise<Array<{ id: string; nombreCompleto: string | null }>> {
    const servicio = await this.obtenerPorId(id);
    return servicio.profesionales || [];
  }

  async actualizar(id: string, dto: ActualizarServicioDto): Promise<Servicio> {
    const servicio = await this.obtenerPorId(id);

    // Validar nombre único si se modifica
    if (dto.nombre && dto.nombre !== servicio.nombre) {
      const existente = await this.servicioRepo.findOne({
        where: { nombre: dto.nombre.toLowerCase() }
      });
      if (existente) {
        throw new ConflictException(`El servicio "${dto.nombre}" ya existe`);
      }
    }

    // Si cambian profesionales, limpiar y recrear asociaciones
    if (dto.profesionalIds) {
      await this.servicioProfesionalRepo.delete({ servicioId: id });
      const asociaciones = dto.profesionalIds.map(pid =>
        this.servicioProfesionalRepo.create({ servicioId: id, profesionalId: pid })
      );
      await this.servicioProfesionalRepo.save(asociaciones);
    }

    Object.assign(servicio, dto);
    const actualizado = await this.servicioRepo.save(servicio);

    // Enriquecer profesionales
    if (dto.profesionalIds) {
      actualizado.profesionales = await this.profesionalesClient.resumenPorIds(dto.profesionalIds);
    }

    return actualizado;
  }

  async bajaLogica(id: string): Promise<void> {
    const servicio = await this.obtenerPorId(id);
    servicio.activo = false;
    await this.servicioRepo.save(servicio);
  }

  async reactivar(id: string): Promise<void> {
    const servicio = await this.obtenerPorId(id);
    servicio.activo = true;
    await this.servicioRepo.save(servicio);
  }

  /** SER-005 — Estado de readiness del módulo */
  async estado(): Promise<{ modulo: string; dependencias: Record<string, 'ok' | 'no-disponible'>; modoValidacion: string }> {
  const estadoProf = this.profesionalesClient.estado;
  return {
    modulo: 'servicios',
    dependencias: {
      profesionales: estadoProf.reachable ? 'ok' : 'no-disponible',
      },
    modoValidacion: estadoProf.modo,
    };
  }
  async eliminar(id: string): Promise<void> {
  const servicio = await this.servicioRepo.findOne({ where: { id } });
  if (!servicio) {
    throw new NotFoundException(`Servicio ${id} no encontrado`);
  }

  servicio.activo = false;
  await this.servicioRepo.save(servicio);
  }
}