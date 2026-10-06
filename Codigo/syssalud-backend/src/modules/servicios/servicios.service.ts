import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  EstadoServiciosResponse,
  ProfesionalDelServicio,
  Servicio as ServicioDto,
} from '@syssalud/shared-types';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ActualizarServicioDto } from './dto/actualizar-servicio.dto';
import { CrearServicioDto } from './dto/crear-servicio.dto';
import { ServicioProfesional } from './entities/servicio-profesional.entity';
import { Servicio } from './entities/servicio.entity';

/** Código de Postgres para violación de índice único. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * CUU10 — Mantener catálogo de servicios (RN03).
 * Persiste sólo datos propios; los profesionales se validan y enriquecen por
 * la costura REST `ProfesionalesClient` (SER-021…SER-024), nunca por inyección.
 */
@Injectable()
export class ServiciosService {
  private readonly logger = new Logger(ServiciosService.name);

  constructor(
    @InjectRepository(Servicio)
    private readonly servicios: Repository<Servicio>,
    @InjectRepository(ServicioProfesional)
    private readonly asociaciones: Repository<ServicioProfesional>,
    private readonly profesionalesClient: ProfesionalesClient,
    private readonly dataSource: DataSource,
    private readonly turnosClient: TurnosClient,
  ) {}

  /** SER-005: readiness real de la costura y modo de validación. */
  async estado(): Promise<EstadoServiciosResponse> {
    const ok = await this.profesionalesClient.disponible();
    return {
      modulo: 'servicios',
      dependencias: { profesionales: ok ? 'ok' : 'no-disponible' },
      modoValidacion: this.profesionalesClient.modoValidacion,
    };
  }

  /** SER-015: catálogo ordenado por nombre; una sola consulta a Profesionales. */
  async listar(soloActivos = true): Promise<ServicioDto[]> {
    const servicios = await this.servicios.find({
      where: soloActivos ? { activo: true } : {},
      order: { nombre: 'ASC' },
      relations: { servicioProfesionales: true },
    });
    const ids = [
      ...new Set(
        servicios.flatMap((s) =>
          s.servicioProfesionales.map((sp) => sp.profesionalId),
        ),
      ),
    ];
    const profesionales = new Map(
      (await this.profesionalesClient.resumenPorIds(ids)).map((p) => [p.id, p]),
    );
    return servicios.map((s) => this.aDto(s, profesionales));
  }

  /** SER-016 */
  async obtener(id: string): Promise<ServicioDto> {
    const servicio = await this.buscarOFallar(id);
    return this.aDtoEnriquecido(servicio);
  }

  /** SER-017: los consume Turnos para filtrar el selector de profesional. */
  async profesionalesDe(id: string): Promise<ProfesionalDelServicio[]> {
    return (await this.obtener(id)).profesionales;
  }

  /** SER-014 — camino básico CUU10. */
  async crear(dto: CrearServicioDto): Promise<ServicioDto> {
    await this.verificarNombreLibre(dto.nombre);
    await this.validarProfesionales(dto.profesionalIds);

    const { profesionalIds, ...datos } = dto;
    const creado = await this.guardarUnico(() =>
      this.dataSource.transaction(async (tx) => {
        const servicio = await tx.save(tx.create(Servicio, datos));
        await tx.save(
          profesionalIds.map((profesionalId) =>
            tx.create(ServicioProfesional, {
              servicioId: servicio.id,
              profesionalId,
            }),
          ),
        );
        return servicio;
      }),
    );
    return this.obtener(creado.id);
  }

  /** SER-018 — `1.a`, `4.a`, reasignación de profesionales y reactivación. */
  async actualizar(
    id: string,
    dto: ActualizarServicioDto,
  ): Promise<ServicioDto> {
    const servicio = await this.buscarOFallar(id);
    if (dto.nombre !== undefined)
      await this.verificarNombreLibre(dto.nombre, id);
    if (dto.profesionalIds) await this.validarProfesionales(dto.profesionalIds);

    const { profesionalIds, ...cambios } = dto;
    await this.guardarUnico(() =>
      this.dataSource.transaction(async (tx) => {
        await tx.save(Object.assign(servicio, cambios));
        if (profesionalIds) {
          await tx.delete(ServicioProfesional, { servicioId: id });
          await tx.save(
            profesionalIds.map((profesionalId) =>
              tx.create(ServicioProfesional, { servicioId: id, profesionalId }),
            ),
          );
        }
      }),
    );
    return this.obtener(id);
  }

  /**
   * SER-019 / SER-009 — baja lógica: el registro queda para turnos históricos y
   * métricas. Se rechaza con 409 si hay turnos vigentes desde hoy; si Turnos no
   * responde se permite con WARN (los turnos ya tomados conservan su servicio).
   */
  async darDeBaja(id: string): Promise<void> {
    const servicio = await this.buscarOFallar(id);
    const futuros = await this.turnosClient.turnosFuturos(id);
    if (futuros === null) {
      this.logger.warn(
        `Baja del servicio ${id} sin verificar turnos futuros (Turnos no disponible).`,
      );
    } else if (futuros > 0) {
      throw new ConflictException(
        `No se puede dar de baja: el servicio tiene ${futuros} turno${futuros === 1 ? '' : 's'} pendiente${futuros === 1 ? '' : 's'}. Cancelalos o reprogramalos primero.`,
      );
    }
    servicio.activo = false;
    await this.servicios.save(servicio);
  }

  private async buscarOFallar(id: string): Promise<Servicio> {
    const servicio = await this.servicios.findOne({
      where: { id },
      relations: { servicioProfesionales: true },
    });
    if (!servicio) throw new NotFoundException('El servicio no existe.');
    return servicio;
  }

  /** SER-025: único sin distinguir mayúsculas ni espacios sobrantes. */
  private async verificarNombreLibre(
    nombre: string,
    excluirId?: string,
  ): Promise<void> {
    const qb = this.servicios
      .createQueryBuilder('s')
      .where('LOWER(TRIM(s.nombre)) = LOWER(TRIM(:nombre))', { nombre });
    if (excluirId) qb.andWhere('s.id <> :excluirId', { excluirId });
    if (await qb.getExists()) {
      throw new ConflictException(
        `Ya existe un servicio llamado "${nombre.trim()}".`,
      );
    }
  }

  /** Carrera entre dos altas con el mismo nombre: el índice único responde 409, no 500. */
  private async guardarUnico<T>(operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      const codigo = (
        error as QueryFailedError & { driverError?: { code?: string } }
      ).driverError?.code;
      if (error instanceof QueryFailedError && codigo === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('Ya existe un servicio con ese nombre.');
      }
      throw error;
    }
  }

  /**
   * SER-023: ids inexistentes/inactivos → 400. Si la costura no responde:
   * `strict` → 424; `lenient` → se acepta con WARN.
   */
  private async validarProfesionales(ids: string[]): Promise<void> {
    const resultado =
      await this.profesionalesClient.existenYSonProfesionales(ids);
    if (!resultado.verificado) {
      if (this.profesionalesClient.modoValidacion === 'strict') {
        throw new HttpException(
          'No se pudieron validar los profesionales: el módulo Profesionales no está disponible.',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      this.logger.warn(
        `Profesionales sin verificar (modo lenient): ${ids.join(', ')}`,
      );
      return;
    }
    if (resultado.invalidos.length) {
      throw new BadRequestException(
        `Profesionales inexistentes o inactivos: ${resultado.invalidos.join(', ')}.`,
      );
    }
  }

  private async aDtoEnriquecido(servicio: Servicio): Promise<ServicioDto> {
    const ids = servicio.servicioProfesionales.map((sp) => sp.profesionalId);
    const profesionales = new Map(
      (await this.profesionalesClient.resumenPorIds(ids)).map((p) => [p.id, p]),
    );
    return this.aDto(servicio, profesionales);
  }

  private aDto(
    servicio: Servicio,
    profesionales: Map<string, ProfesionalDelServicio>,
  ): ServicioDto {
    return {
      id: servicio.id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracionMin: servicio.duracionMin,
      precio: servicio.precio,
      activo: servicio.activo,
      profesionales: servicio.servicioProfesionales.map(
        (sp) => profesionales.get(sp.profesionalId) ?? { id: sp.profesionalId },
      ),
      creadoEn: servicio.creadoEn.toISOString(),
      actualizadoEn: servicio.actualizadoEn.toISOString(),
    };
  }
}
