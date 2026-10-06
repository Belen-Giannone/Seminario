import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  BuscarHistoriaQuery,
  CrearEntradaRequest,
  EntradaClinica,
  HistoriaClinica,
  HistoriaClinicaInexistente,
  PacienteResumen,
  ResultadoBusquedaHistoria,
} from '@syssalud/shared-types';
import { Repository } from 'typeorm';
import { PacienteDetalle, PacientesClient } from './clients/pacientes.client';
import { TurnoAsistido, TurnosClient } from './clients/turnos.client';
import { EntradaClinica as EntradaClinicaEntity } from './entities/entrada-clinica.entity';
import { HistoriaClinica as HistoriaClinicaEntity } from './entities/historia-clinica.entity';

/** Zona horaria del consultorio: la `fecha` de la entrada es el día local, no el UTC. */
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const MSJ_SIN_COINCIDENCIAS =
  'No se encontraron pacientes con los criterios ingresados.';

type ModoValidacion = 'lenient' | 'strict';

/**
 * CUU09 - Gestionar historia clínica (RN02, RN10).
 * Persiste únicamente datos propios del módulo. Pacientes y Turnos se
 * integran por costura REST (HCL-017/018) reenviando el JWT del profesional,
 * sin importar services ni entidades de otros módulos.
 */
@Injectable()
export class HistoriaClinicaService {
  private readonly logger = new Logger(HistoriaClinicaService.name);

  constructor(
    @InjectRepository(HistoriaClinicaEntity)
    private readonly historias: Repository<HistoriaClinicaEntity>,
    @InjectRepository(EntradaClinicaEntity)
    private readonly entradas: Repository<EntradaClinicaEntity>,
    private readonly pacientesClient: PacientesClient,
    private readonly turnosClient: TurnosClient,
    private readonly config: ConfigService,
  ) {}

  private get modoValidacion(): ModoValidacion {
    return this.config.get<string>('HISTORIA_VALIDAR_TURNOS') === 'strict'
      ? 'strict'
      : 'lenient';
  }

  /** HCL-004: readiness real de las dependencias, sin datos clínicos. */
  async estado() {
    const [pacientes, turnos] = await Promise.all([
      this.pacientesClient.disponible(),
      this.turnosClient.disponible(),
    ]);
    return {
      modulo: 'historia-clinica',
      dependencias: {
        pacientes: pacientes ? 'disponible' : 'no disponible',
        turnos: turnos ? 'disponible' : 'no disponible',
      },
      modoValidacion: this.modoValidacion,
    };
  }

  /**
   * HCL-012 - CUU09 pasos 1-2. Resuelve el paciente en Pacientes por DNI o por
   * nombre + apellido. Sin Pacientes no hay forma de resolver el criterio:
   * `503` en lenient, `424` en strict (HCL-017).
   */
  async buscar(
    query: BuscarHistoriaQuery,
    profesionalId: string,
    authorization: string,
  ): Promise<ResultadoBusquedaHistoria> {
    const dni = query.dni?.trim();
    const nombre = query.nombre?.trim();
    const apellido = query.apellido?.trim();
    if (!dni && !apellido) {
      throw new BadRequestException(
        'Debe indicar el DNI o el nombre y apellido del paciente',
      );
    }

    let pacientes: PacienteResumen[];
    try {
      // Se manda un único término (DNI o apellido) y el resultado se refina acá,
      // así no dependemos de cómo implemente Pacientes su búsqueda.
      pacientes = await this.pacientesClient.buscar(
        dni ?? apellido,
        authorization,
      );
    } catch {
      if (this.modoValidacion === 'strict') {
        throw new HttpException(
          'No se pudo consultar el servicio de Pacientes',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      throw new ServiceUnavailableException(
        'El servicio de Pacientes no está disponible. Intente nuevamente más tarde.',
      );
    }

    const coincidencias = dni
      ? pacientes.filter((paciente) => paciente.dni === dni)
      : pacientes.filter((paciente) => {
          const completo = normalizar(paciente.nombreCompleto ?? '');
          return (
            completo.includes(normalizar(apellido)) &&
            completo.includes(normalizar(nombre ?? ''))
          );
        });

    if (!coincidencias.length)
      throw new NotFoundException(MSJ_SIN_COINCIDENCIAS);
    if (coincidencias.length > 1) return coincidencias;
    return this.obtener(coincidencias[0].id, profesionalId, authorization);
  }

  /** HCL-013. Cada lectura queda en el log de auditoría (HCL-034). */
  async obtener(
    pacienteId: string,
    profesionalId: string,
    authorization: string,
  ): Promise<HistoriaClinica | HistoriaClinicaInexistente> {
    this.auditarLectura(pacienteId, profesionalId);
    const paciente = await this.resolverPaciente(pacienteId, authorization);
    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) return { existe: false, pacienteId };
    return this.aDto(historia, await this.entradasDe(historia), paciente);
  }

  /** HCL-014 - alt 2.a. Idempotente (RN02): si ya existe, la devuelve. */
  async inicializar(
    pacienteId: string,
    profesionalId: string,
    authorization: string,
  ): Promise<HistoriaClinica> {
    const paciente = await this.resolverPaciente(pacienteId, authorization);
    const existente = await this.historias.findOne({ where: { pacienteId } });
    if (existente) {
      this.auditarLectura(pacienteId, profesionalId);
      return this.aDto(existente, await this.entradasDe(existente), paciente);
    }

    try {
      const creada = await this.historias.save(
        this.historias.create({ pacienteId }),
      );
      return this.aDto(creada, [], paciente);
    } catch (error) {
      // Carrera con otra solicitud: el índice único sobre pacienteId la frenó.
      const creadaPorOtraSolicitud = await this.historias.findOne({
        where: { pacienteId },
      });
      if (creadaPorOtraSolicitud) {
        this.auditarLectura(pacienteId, profesionalId);
        return this.aDto(
          creadaPorOtraSolicitud,
          await this.entradasDe(creadaPorOtraSolicitud),
          paciente,
        );
      }
      this.logger.error(
        `No se pudo inicializar la HC del paciente ${pacienteId}: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
      throw new ConflictException('No se pudo inicializar la historia clínica');
    }
  }

  /** HCL-015 - CUU09 pasos 3-5 (HCL-021, HCL-022, HCL-023). */
  async agregarEntrada(
    pacienteId: string,
    profesionalId: string,
    dto: CrearEntradaRequest,
    authorization: string,
  ): Promise<EntradaClinica> {
    const observaciones = dto.observaciones?.trim() ?? '';
    const antecedentes = dto.antecedentes?.trim() ?? '';
    const tratamientos = dto.tratamientos?.trim() ?? '';
    if (!observaciones && !antecedentes && !tratamientos) {
      throw new BadRequestException('Debe completar al menos un campo clínico');
    }

    const historia = await this.historias.findOne({ where: { pacienteId } });
    if (!historia) {
      throw new NotFoundException(
        'El paciente no cuenta con una historia clínica previa',
      );
    }

    const turnoId = await this.resolverTurno(
      pacienteId,
      profesionalId,
      dto.turnoId,
      authorization,
    );

    const entrada = await this.entradas.save(
      this.entradas.create({
        historiaId: historia.id,
        turnoId,
        profesionalId,
        fecha: fechaLocal(new Date()),
        observaciones,
        antecedentes,
        tratamientos,
      }),
    );
    return this.entradaADto(entrada);
  }

  /**
   * Precondición "consulta asociada" (HCL-021). Sin `turnoId`, se asocia el
   * turno asistido más reciente. En lenient, si Turnos no responde o no hay
   * turno, se registra igual con `turnoId` nulo + WARN.
   */
  private async resolverTurno(
    pacienteId: string,
    profesionalId: string,
    turnoIdSolicitado: string | undefined,
    authorization: string,
  ): Promise<string | null> {
    let turnos: TurnoAsistido[];
    try {
      turnos = await this.turnosClient.turnosAsistidos(
        pacienteId,
        profesionalId,
        authorization,
      );
    } catch {
      if (this.modoValidacion === 'strict') {
        throw new HttpException(
          'No se pudo validar la consulta asociada',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      this.logger.warn(
        `Se omite validación de turno para paciente ${pacienteId}`,
      );
      return null;
    }

    const turno = turnoIdSolicitado
      ? turnos.find((item) => item.idTurno === turnoIdSolicitado)
      : [...turnos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

    if (!turno) {
      if (this.modoValidacion === 'strict') {
        throw new HttpException(
          'No existe una consulta asistida asociada',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      this.logger.warn(
        `No se encontró turno asistido para paciente ${pacienteId}`,
      );
      return null;
    }
    return turno.idTurno;
  }

  /**
   * Verifica el paciente en Pacientes. `404` si Pacientes confirma que no
   * existe. Si Pacientes no responde: en strict `424`; en lenient se sigue con
   * datos personales nulos + WARN (HCL-002 / HCL-017).
   */
  private async resolverPaciente(
    pacienteId: string,
    authorization: string,
  ): Promise<PacienteDetalle | null> {
    let paciente: PacienteDetalle | null;
    try {
      paciente = await this.pacientesClient.obtener(pacienteId, authorization);
    } catch {
      if (this.modoValidacion === 'strict') {
        throw new HttpException(
          'No se pudo consultar el paciente',
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
      this.logger.warn(
        `Pacientes no responde; se continúa sin datos personales de ${pacienteId}`,
      );
      return null;
    }
    if (!paciente)
      throw new NotFoundException('El paciente no está registrado');
    return paciente;
  }

  private auditarLectura(pacienteId: string, profesionalId: string): void {
    this.logger.log(
      JSON.stringify({
        evento: 'lectura_historia_clinica',
        profesionalId,
        pacienteId,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  private entradasDe(
    historia: HistoriaClinicaEntity,
  ): Promise<EntradaClinicaEntity[]> {
    return this.entradas.find({
      where: { historiaId: historia.id },
      order: { fecha: 'DESC', fechaActualizacion: 'DESC' },
    });
  }

  private aDto(
    historia: HistoriaClinicaEntity,
    entradas: EntradaClinicaEntity[],
    paciente: PacienteDetalle | null,
  ): HistoriaClinica {
    const nomAppPac = paciente
      ? [paciente.nombre, paciente.apellido].filter(Boolean).join(' ') || null
      : null;
    return {
      idHistoria: historia.id,
      pacienteId: historia.pacienteId,
      nomAppPac,
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
      // Best-effort (HCL-010): el módulo Profesionales todavía no expone el resumen.
      autor: null,
    };
  }
}

/** `YYYY-MM-DD` en la zona horaria del consultorio. */
export function fechaLocal(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/** Minúsculas y sin acentos, para comparar nombres. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
