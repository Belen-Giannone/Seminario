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
  idTurno: string | null;
  fecha: string;
  observaciones: string;
  antecedentes: string;
  tratamientos: string;
  fechaActualizacion: string;
  profesionalId: string;
  autor: null;
}

export interface HistoriaClinica {
  idHistoria: string;
  pacienteId: string;
  nomAppPac: string | null;
  telefono: string | null;
  correo: string | null;
  entradas: EntradaClinica[];
}

export interface HistoriaClinicaInexistente {
  existe: false;
  pacienteId: string;
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
 * integran por HTTP, sin importar services ni entidades de otros módulos.
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
    if (existente) return this.obtenerCompleta(pacienteId, 'sistema');

    try {
      const creada = await this.historias.save(this.historias.create({ pacienteId }));
      return this.aDto(creada, []);
    } catch {
      const creadaPorOtraSolicitud = await this.historias.findOne({ where: { pacienteId } });
      if (creadaPorOtraSolicitud) return this.obtenerCompleta(pacienteId, 'sistema');
      throw new ConflictException('No se pudo inicializar la historia clínica');
    }
  }

  async buscar(query: BuscarHistoriaRequest, profesionalId: string): Promise<HistoriaClinica | HistoriaClinicaInexistente | PacienteResumen[]> {
    const criterio = query.buscar ?? query.dni ?? [query.nombre, query.apellido].filter(Boolean).join(' ').trim();
    if (!criterio?.trim()) throw new ConflictException('Debe indicar un criterio de búsqueda');

    try {
      const pacientes = await this.pacientesClient.buscar(criterio.trim());
      if (!pacientes.length) throw new NotFoundException('No se encontraron pacientes con los criterios ingresados.');
      if (pacientes.length > 1) return pacientes;
      return this.obtener(pacientes[0].id, profesionalId);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (this.modoValidacion === 'strict') {
        throw new HttpException('No se pudo consultar el servicio de Pacientes', HttpStatus.FAILED_DEPENDENCY);
      }
      return this.obtener(criterio.trim(), profesionalId);
    }
  }

  async obtener(pacienteId: string, profesionalId: string): Promise<HistoriaClinica | HistoriaClinicaInexistente> {
    this.logger.log(JSON.stringify({
      evento: 'lectura_historia_clinica',
      profesionalId,
      pacienteId,
      timestamp: new Date().toISOString(),
    }));
    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) return { existe: false, pacienteId };
    return this.obtenerCompleta(pacienteId, profesionalId, historia);
  }

  async agregarEntrada(pacienteId: string, profesionalId: string, dto: CrearEntradaRequest): Promise<EntradaClinica> {
    if (![dto.observaciones, dto.antecedentes, dto.tratamientos].some((campo) => campo?.trim())) {
      throw new ConflictException('Debe completar al menos un campo clínico');
    }

    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) throw new NotFoundException('El paciente no cuenta con una historia clínica previa');

    let turnoId = dto.turnoId ?? null;
    try {
      const turnos = await this.turnosClient.turnosAsistidos(pacienteId, profesionalId);
      const turno = dto.turnoId ? turnos.find((item) => item.idTurno === dto.turnoId) : turnos[0];
      if (!turno && this.modoValidacion === 'strict') {
        throw new HttpException('No existe una consulta asistida asociada', HttpStatus.FAILED_DEPENDENCY);
      }
      if (!turno) this.logger.warn(`No se encontró turno asistido para paciente ${pacienteId}`);
      turnoId = turno?.idTurno ?? null;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.FAILED_DEPENDENCY) throw error;
      if (this.modoValidacion === 'strict') {
        throw new HttpException('No se pudo validar la consulta asociada', HttpStatus.FAILED_DEPENDENCY);
      }
      this.logger.warn(`Se omite validación de turno para paciente ${pacienteId}`);
      turnoId = null;
    }

    const entrada = await this.entradas.save(this.entradas.create({
      historiaId: historia.id,
      turnoId,
      profesionalId,
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: dto.observaciones.trim(),
      antecedentes: dto.antecedentes.trim(),
      tratamientos: dto.tratamientos.trim(),
    }));
    return this.entradaADto(entrada);
  }

  private async obtenerCompleta(pacienteId: string, modoAuditoria: string, historiaExistente?: HistoriaClinicaEntity): Promise<HistoriaClinica> {
    const historia = historiaExistente ?? await this.historias.findOne({ where: { pacienteId } });
    if (!historia) throw new NotFoundException('El paciente no cuenta con una historia clínica previa');
    const entradas = await this.entradas.find({
      where: { historiaId: historia.id },
      order: { fecha: 'DESC', fechaActualizacion: 'DESC' },
    });
    let paciente: PacienteDetalle | null = null;
    try {
      paciente = await this.pacientesClient.obtener(pacienteId);
    } catch {
      if (this.modoValidacion === 'strict') throw new HttpException('No se pudo consultar el paciente', HttpStatus.FAILED_DEPENDENCY);
    }
    if (!paciente && this.modoValidacion === 'strict') throw new NotFoundException('El paciente no existe');
    return this.aDto(historia, entradas, paciente);
  }

  private aDto(historia: HistoriaClinicaEntity, entradas: EntradaClinicaEntity[], paciente: PacienteDetalle | null = null): HistoriaClinica {
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
      idTurno: entrada.turnoId,
      fecha: entrada.fecha,
      observaciones: entrada.observaciones,
      antecedentes: entrada.antecedentes,
      tratamientos: entrada.tratamientos,
      fechaActualizacion: entrada.fechaActualizacion.toISOString(),
      profesionalId: entrada.profesionalId,
      autor: null,
    };
  }
}
