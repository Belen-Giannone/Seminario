import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacientesClient, PacienteDetalle, PacienteResumen } from './clients/pacientes.client';
import { EntradaClinica as EntradaClinicaEntity } from './entities/entrada-clinica.entity';
import { HistoriaClinica as HistoriaClinicaEntity } from './entities/historia-clinica.entity';
import { TurnosClient } from './clients/turnos.client';

export interface EntradaClinica {
  id: string;
  turnoId: string | null;
  fecha: string;
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  fechaActualizacion: string;
  profesionalId: string;
}

export interface HistoriaClinica {
  idHistoria: string;
  pacienteId: string;
  nomAppPac: string | null;
  telefono: string | null;
  correo: string | null;
  entradas: EntradaClinica[];
}

interface BuscarHistoriaRequest {
  buscar?: string;
  dni?: string;
  nombre?: string;
  apellido?: string;
}

interface CrearEntradaRequest {
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  turnoId?: string;
}

/**
 * CUU09 - Gestionar historia clínica (RN02, RN10).
 * Persiste únicamente datos propios del módulo. Pacientes y Turnos se
 * integrarán por HTTP, sin importar services ni entidades de esos módulos.
 */
@Injectable()
export class HistoriaClinicaService {
  private readonly logger = new Logger(HistoriaClinicaService.name);
  private readonly modoValidacion = process.env.HISTORIA_VALIDAR_TURNOS === 'strict' ? 'strict' : 'lenient';

  constructor(
    @InjectRepository(HistoriaClinicaEntity)
    private readonly historias: Repository<HistoriaClinicaEntity>,
    @InjectRepository(EntradaClinicaEntity)
    private readonly entradas: Repository<EntradaClinicaEntity>,
    private readonly pacientesClient: PacientesClient,
    private readonly turnosClient: TurnosClient,
  ) {}

  estado() {
    return {
      modulo: 'historia-clinica',
      dependencias: { pacientes: 'no conectada', turnos: 'no conectada' },
      modoValidacion: this.modoValidacion,
    };
  }

  async inicializar(pacienteId: string): Promise<HistoriaClinica> {
    const existente = await this.historias.findOne({ where: { pacienteId } });
    if (existente) return this.obtener(pacienteId);

    try {
      const creada = await this.historias.save(this.historias.create({ pacienteId }));
      return this.aDto(creada, []);
    } catch {
      const creadaPorOtraSolicitud = await this.historias.findOne({ where: { pacienteId } });
      if (creadaPorOtraSolicitud) return this.obtener(pacienteId);
      throw new ConflictException('No se pudo inicializar la historia clínica');
    }
  }

  async buscar(query: BuscarHistoriaRequest): Promise<HistoriaClinica | PacienteResumen[]> {
    const criterio = query.buscar ?? query.dni ?? [query.nombre, query.apellido].filter(Boolean).join(' ').trim();
    if (!criterio?.trim()) {
      throw new ConflictException('Debe indicar un criterio de búsqueda');
    }

    try {
      const pacientes = await this.pacientesClient.buscar(criterio.trim());
      if (!pacientes.length) {
        throw new NotFoundException('No se encontraron pacientes con los criterios ingresados.');
      }
      if (pacientes.length > 1) return pacientes;
      return this.obtener(pacientes[0].id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (this.modoValidacion === 'strict') {
        throw new ConflictException('No se pudo consultar el servicio de Pacientes');
      }
      return this.obtener(criterio.trim());
    }
  }

  async obtener(pacienteId: string): Promise<HistoriaClinica> {
    this.logger.log(`Acceso de lectura a historia clínica: paciente ${pacienteId}`);
    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) {
      throw new NotFoundException('El paciente no cuenta con una historia clínica previa');
    }

    const entradas = await this.entradas.find({
      where: { historiaId: historia.id },
      order: { fecha: 'DESC', fechaActualizacion: 'DESC' },
    });
    let paciente: PacienteDetalle | null = null;
    try {
      paciente = await this.pacientesClient.obtener(pacienteId);
    } catch {
      if (this.modoValidacion === 'strict') {
        throw new HttpException('No se pudo consultar el paciente', HttpStatus.FAILED_DEPENDENCY);
      }
    }
    if (!paciente && this.modoValidacion === 'strict') {
      throw new NotFoundException('El paciente no existe');
    }
    return this.aDto(historia, entradas, paciente);
  }

  async agregarEntrada(
    pacienteId: string,
    profesionalId: string,
    dto: CrearEntradaRequest,
  ): Promise<EntradaClinica> {
    if (![dto.observaciones, dto.antecedentes, dto.tratamientos].some((campo) => campo?.trim())) {
      throw new ConflictException('Debe completar al menos un campo clínico');
    }

    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) {
      throw new NotFoundException('El paciente no cuenta con una historia clínica previa');
    }
    let turnoId = dto.turnoId ?? null;
    try {
      const turnos = await this.turnosClient.turnosAsistidos(pacienteId, profesionalId);
      const turno = dto.turnoId
        ? turnos.find((item) => item.idTurno === dto.turnoId)
        : turnos[0];
      if (!turno && this.modoValidacion === 'strict') {
        throw new HttpException('No existe una consulta asistida asociada', HttpStatus.FAILED_DEPENDENCY);
      }
      turnoId = turno?.idTurno ?? null;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (this.modoValidacion === 'strict') {
        throw new HttpException('No se pudo validar la consulta asociada', HttpStatus.FAILED_DEPENDENCY);
      }
      turnoId = null;
    }

    const entrada = await this.entradas.save(
      this.entradas.create({
        historiaId: historia.id,
        turnoId,
        profesionalId,
        fecha: new Date().toISOString().slice(0, 10),
        observaciones: dto.observaciones.trim(),
        antecedentes: dto.antecedentes.trim(),
        tratamientos: dto.tratamientos.trim(),
      }),
    );
    return this.entradaADto(entrada);
  }

  private aDto(
    historia: HistoriaClinicaEntity,
    entradas: EntradaClinicaEntity[],
    paciente: PacienteDetalle | null = null,
  ): HistoriaClinica {
    return {
      idHistoria: historia.id,
      pacienteId: historia.pacienteId,
      nomAppPac: paciente?.nombreCompleto ?? ([paciente?.nombre, paciente?.apellido].filter(Boolean).join(' ') || null),
      telefono: paciente?.telefono ?? null,
      correo: paciente?.email ?? null,
      entradas: entradas.map((entrada) => this.entradaADto(entrada)),
    };
  }

  private entradaADto(entrada: EntradaClinicaEntity): EntradaClinica {
    return {
      id: entrada.id,
      turnoId: entrada.turnoId,
      fecha: entrada.fecha,
      observaciones: entrada.observaciones,
      antecedentes: entrada.antecedentes,
      tratamientos: entrada.tratamientos,
      fechaActualizacion: entrada.fechaActualizacion.toISOString(),
      profesionalId: entrada.profesionalId,
    };
  }
}
