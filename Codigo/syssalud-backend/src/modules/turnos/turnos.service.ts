import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import {
  EstadoPago,
  EstadoTurno,
  LiquidacionPago,
  Rol,
  Turno as TurnoDto,
  TurnoResumen,
} from '@syssalud/shared-types';
import { Turno } from './entities/turno.entity';
import { SolicitarTurnoDto } from './dto/solicitar-turno.dto';
import { PagarTurnoDto } from './dto/pagar-turno.dto';
import { ReprogramarTurnoDto } from './dto/reprogramar-turno.dto';
import { CancelarTurnoDto } from './dto/cancelar-turno.dto';
import { ListarTurnosQueryDto } from './dto/listar-turnos-query.dto';
import { PacientesClient } from './clients/pacientes.client';
import { ServiciosClient } from './clients/servicios.client';
import { ProfesionalesClient } from './clients/profesionales.client';
import { AgendaClient } from './clients/agenda.client';
import { PagosClient } from './clients/pagos.client';
import { NotificacionesClient } from './clients/notificaciones.client';

type ModoValidacion = 'lenient' | 'strict';
type Solicitante = { sub: string; rol: Rol };

const ESTADOS_VIGENTES = [
  EstadoTurno.SOLICITADO,
  EstadoTurno.CONFIRMADO,
  EstadoTurno.REPROGRAMADO,
];

/**
 * TUR-005: orquestador de CUU02/03/04. TUR-001/002: sin acoplamiento en
 * proceso, sólo costuras REST con degradación elegante.
 *
 * Regla general de degradación: los flags `lenient`/`strict` sólo deciden
 * qué pasa cuando una costura está CAÍDA (timeout/conexión). Una respuesta
 * explícita de una costura que SÍ contesta (p. ej. "paciente no registrado"
 * o "slot ocupado") siempre se respeta, en cualquier modo.
 */
@Injectable()
export class TurnosService {
  private readonly modoValidarAgenda: ModoValidacion;
  private readonly modoValidarPacientes: ModoValidacion;
  private readonly reservaMin: number;

  constructor(
    @InjectRepository(Turno)
    private readonly turnosRepo: Repository<Turno>,
    private readonly dataSource: DataSource,
    private readonly pacientesClient: PacientesClient,
    private readonly serviciosClient: ServiciosClient,
    private readonly profesionalesClient: ProfesionalesClient,
    private readonly agendaClient: AgendaClient,
    private readonly pagosClient: PagosClient,
    private readonly notificacionesClient: NotificacionesClient,
    private readonly config: ConfigService,
  ) {
    this.modoValidarAgenda = this.config.get<ModoValidacion>(
      'TURNOS_VALIDAR_AGENDA',
      'lenient',
    );
    this.modoValidarPacientes = this.config.get<ModoValidacion>(
      'TURNOS_VALIDAR_PACIENTES',
      'lenient',
    );
    this.reservaMin = Number(this.config.get('TURNOS_RESERVA_MIN', 15));
  }

  /** TUR-004 */
  async estado() {
    return {
      modulo: 'turnos',
      dependencias: {
        pacientes: 'pacientes',
        servicios: 'servicios',
        profesionales: 'profesionales',
        agenda: 'agenda',
        pagos: 'pagos',
        notificaciones: 'notificaciones',
      },
      modo: {
        validarAgenda: this.modoValidarAgenda,
        validarPacientes: this.modoValidarPacientes,
      },
    };
  }

  /** TUR-013 — CUU02 pasos 3-4. */
  async solicitar(
    dto: SolicitarTurnoDto,
    solicitante: Solicitante,
  ): Promise<{ turno: TurnoDto; liquidacion: LiquidacionPago }> {
    const pacienteId = await this.resolverPacienteIdParaCreacion(dto, solicitante);

    // RN06: paciente registrado.
    const registrado = await this.pacientesClient.estaRegistrado(pacienteId);
    if (registrado === false) {
      throw new BadRequestException('El paciente no se encuentra registrado.');
    }
    if (registrado === null && this.modoValidarPacientes === 'strict') {
      throw new HttpException(
        'No se pudo validar el registro del paciente (Pacientes no disponible).',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    // RN07: día laborable (L-V). RN08 (feriados) la garantiza Agenda cuando responde.
    if (!this.esDiaLaborable(dto.fecha)) {
      throw new BadRequestException(
        'No hay horarios disponibles para el servicio o profesional seleccionado en esta fecha.',
      );
    }

    // Profesional/Servicio: best-effort (TUR-023/024), nunca bloquean por sí
    // solos, salvo que el id directamente no exista en una costura que sí respondió.
    await this.profesionalesClient.existe(dto.profesionalId);
    const servicio = await this.serviciosClient.obtener(dto.servicioId);
    const monto = servicio?.precio ?? 0;

    // RN09/RN19: disponibilidad real vía Agenda.
    const slots = await this.agendaClient.disponibilidad(
      dto.profesionalId,
      dto.servicioId,
      dto.fecha,
    );
    if (slots === null && this.modoValidarAgenda === 'strict') {
      throw new HttpException(
        'No se pudo validar la disponibilidad (Agenda no disponible).',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    if (slots !== null && !slots.some((s) => s.hora === dto.hora)) {
      throw new ConflictException(
        'No hay horarios disponibles para el servicio o profesional seleccionado en esta fecha.',
      );
    }

    const turno = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Turno);
      await manager.query('LOCK TABLE turnos IN EXCLUSIVE MODE');

      const ocupante = await repo.findOne({
        where: { profesionalId: dto.profesionalId, fecha: dto.fecha, hora: dto.hora },
      });
      if (ocupante && !this.estaVencidaLaReserva(ocupante)) {
        if (ESTADOS_VIGENTES.includes(ocupante.estado)) {
          throw new ConflictException(
            'No hay horarios disponibles para el servicio o profesional seleccionado en esta fecha.',
          );
        }
      }
      if (ocupante && this.estaVencidaLaReserva(ocupante)) {
        ocupante.estado = EstadoTurno.NO_CONFIRMADO;
        await repo.save(ocupante);
      }

      const nuevo = repo.create({
        pacienteId,
        profesionalId: dto.profesionalId,
        servicioId: dto.servicioId,
        fecha: dto.fecha,
        hora: dto.hora,
        estado: EstadoTurno.SOLICITADO,
        monto,
        pagoId: null,
        comprobanteNumero: null,
        reservaExpiraEn: new Date(Date.now() + this.reservaMin * 60_000),
        creadoPor: solicitante.sub,
        origen: solicitante.rol === Rol.PACIENTE ? 'PACIENTE' : 'ASISTENTE',
        motivoCancelacion: null,
        idTransaccion: null,
      });
      return repo.save(nuevo);
    });

    return {
      turno: this.aDto(turno),
      liquidacion: {
        pacienteId,
        servicioId: dto.servicioId,
        profesionalId: dto.profesionalId,
        fecha: dto.fecha,
        hora: dto.hora,
        monto,
      },
    };
  }

  /** TUR-014 — CUU02 paso 5. */
  async pagar(
    id: string,
    dto: PagarTurnoDto,
    solicitante: Solicitante,
  ): Promise<TurnoDto> {
    const turno = await this.buscarOFallar(id);
    await this.verificarAccesoPropioOStaff(turno, solicitante);
    await this.expirarSiVencido(turno);

    if (turno.estado === EstadoTurno.CONFIRMADO) {
      // TUR-049: reintento idempotente del mismo pago ya aprobado.
      if (turno.idTransaccion === dto.idTransaccion) return this.aDto(turno);
      throw new ConflictException('El turno ya fue confirmado.');
    }
    if (turno.estado !== EstadoTurno.SOLICITADO) {
      throw new ConflictException('El turno no admite un pago en su estado actual.');
    }

    const resultado = await this.pagosClient.procesar(
      turno.id,
      dto.metodoPago,
      turno.monto,
      dto.idTransaccion,
    );

    if (resultado === null) {
      // Pagos caído: queda SOLICITADO, se puede reintentar luego (TUR-002).
      turno.idTransaccion = dto.idTransaccion;
      await this.turnosRepo.save(turno);
      return this.aDto(turno);
    }

    if (resultado.estado === EstadoPago.APROBADO) {
      turno.estado = EstadoTurno.CONFIRMADO;
      turno.pagoId = resultado.pagoId;
      turno.comprobanteNumero = resultado.comprobanteNumero ?? null;
      turno.idTransaccion = dto.idTransaccion;
      await this.turnosRepo.save(turno);
      await this.notificacionesClient.enviar(
        turno.pacienteId,
        `Turno confirmado. Detalles: profesional ${turno.profesionalId}, servicio ${turno.servicioId}, ${turno.fecha} ${turno.hora}.`,
      );
      return this.aDto(turno);
    }

    // RN20: pago rechazado → libera el slot.
    turno.estado = EstadoTurno.NO_CONFIRMADO;
    await this.turnosRepo.save(turno);
    throw new HttpException(
      'La transacción de pago fue rechazada. El turno no pudo ser confirmado.',
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  /** TUR-015. */
  async listar(query: ListarTurnosQueryDto, solicitante: Solicitante): Promise<TurnoResumen[]> {
    const qb = this.turnosRepo.createQueryBuilder('t');

    // `pacienteId`/`profesionalId` de la query sólo acotan más (nunca
    // amplían) lo que cada rol ya puede ver.
    if (query.pacienteId) qb.andWhere('t.pacienteId = :pacienteId', { pacienteId: query.pacienteId });
    if (query.profesionalId)
      qb.andWhere('t.profesionalId = :profesionalId', { profesionalId: query.profesionalId });

    if (solicitante.rol === Rol.PACIENTE) {
      const pacienteId = await this.resolverPacienteIdDelSub(solicitante.sub);
      qb.andWhere('t.pacienteId = :pacienteIdPropio', { pacienteIdPropio: pacienteId });
    } else if (solicitante.rol === Rol.PROFESIONAL) {
      const profesionalId = await this.resolverProfesionalIdDelSub(solicitante.sub);
      qb.andWhere('t.profesionalId = :profesionalIdPropio', { profesionalIdPropio: profesionalId });
    }

    if (query.estado) qb.andWhere('t.estado = :estado', { estado: query.estado });
    if (query.desde) qb.andWhere('t.fecha >= :desde', { desde: query.desde });
    if (query.hasta) qb.andWhere('t.fecha <= :hasta', { hasta: query.hasta });

    const turnos = await qb.orderBy('t.fecha', 'ASC').addOrderBy('t.hora', 'ASC').getMany();
    return turnos.map((t) => ({
      idTurno: t.id,
      fecha: t.fecha,
      hora: t.hora,
      estado: t.estado,
      pacienteId: t.pacienteId,
      servicioId: t.servicioId,
    }));
  }

  /** TUR-020 — atajo del paciente. */
  async misTurnos(solicitante: Solicitante): Promise<TurnoResumen[]> {
    const pacienteId = await this.resolverPacienteIdDelSub(solicitante.sub);
    const turnos = await this.turnosRepo.find({
      where: { pacienteId },
      order: { fecha: 'ASC', hora: 'ASC' },
    });
    const vigentes: TurnoResumen[] = [];
    for (const t of turnos) {
      await this.expirarSiVencido(t);
      if (ESTADOS_VIGENTES.includes(t.estado)) {
        vigentes.push({ idTurno: t.id, fecha: t.fecha, hora: t.hora, estado: t.estado });
      }
    }
    return vigentes;
  }

  /** TUR-016. */
  async obtener(id: string, solicitante: Solicitante): Promise<TurnoDto> {
    const turno = await this.buscarOFallar(id);
    await this.verificarAccesoPropioOStaff(turno, solicitante);
    await this.expirarSiVencido(turno);
    return this.aDto(turno);
  }

  /** TUR-017 — CUU03. */
  async cancelar(
    id: string,
    dto: CancelarTurnoDto,
    solicitante: Solicitante,
  ): Promise<TurnoDto> {
    const turno = await this.buscarOFallar(id);
    await this.verificarAccesoPropioOStaff(turno, solicitante);
    await this.expirarSiVencido(turno);

    if (!ESTADOS_VIGENTES.includes(turno.estado)) {
      throw new ConflictException('El turno no admite cancelación en su estado actual.');
    }
    this.verificarPlazo(turno, solicitante, 'cancelar');

    turno.estado = EstadoTurno.CANCELADO;
    turno.motivoCancelacion = dto.motivo ?? null;
    await this.turnosRepo.save(turno);

    if (turno.pagoId) {
      // RN21/RN23: la devolución del dinero la hace la asistente manualmente.
      await this.pagosClient.ajustarReembolso(turno.pagoId);
    }
    await this.notificacionesClient.enviar(
      turno.pacienteId,
      `Turno cancelado. Detalles: ${turno.fecha} ${turno.hora}.`,
    );
    return this.aDto(turno);
  }

  /** TUR-018 — CUU04. */
  async reprogramar(
    id: string,
    dto: ReprogramarTurnoDto,
    solicitante: Solicitante,
  ): Promise<TurnoDto> {
    const turno = await this.buscarOFallar(id);
    await this.verificarAccesoPropioOStaff(turno, solicitante);
    await this.expirarSiVencido(turno);

    if (turno.estado !== EstadoTurno.CONFIRMADO && turno.estado !== EstadoTurno.REPROGRAMADO) {
      throw new ConflictException('El turno no admite reprogramación en su estado actual.');
    }
    this.verificarPlazo(turno, solicitante, 'reprogramar');

    const slots = await this.agendaClient.disponibilidad(
      turno.profesionalId,
      turno.servicioId,
      dto.fecha,
    );
    if (slots === null && this.modoValidarAgenda === 'strict') {
      throw new HttpException(
        'No se pudo validar la disponibilidad (Agenda no disponible).',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    if (slots !== null && !slots.some((s) => s.hora === dto.hora)) {
      throw new ConflictException(
        'No hay horarios disponibles. ¿Desea cancelar el turno?',
      );
    }

    turno.fecha = dto.fecha;
    turno.hora = dto.hora;
    turno.estado = EstadoTurno.REPROGRAMADO;
    await this.turnosRepo.save(turno);

    await this.notificacionesClient.enviar(
      turno.pacienteId,
      `Turno Reprogramado. Detalles: ${turno.fecha} ${turno.hora}.`,
    );
    return this.aDto(turno);
  }

  /** TUR-019. */
  async marcarAsistencia(id: string): Promise<TurnoDto> {
    const turno = await this.buscarOFallar(id);
    if (turno.estado !== EstadoTurno.CONFIRMADO && turno.estado !== EstadoTurno.REPROGRAMADO) {
      throw new ConflictException('El turno no admite marcar asistencia en su estado actual.');
    }
    turno.estado = EstadoTurno.ASISTIDO;
    await this.turnosRepo.save(turno);
    return this.aDto(turno);
  }

  // ---- privados ----

  private async buscarOFallar(id: string): Promise<Turno> {
    const turno = await this.turnosRepo.findOne({ where: { id } });
    if (!turno) throw new NotFoundException('Turno no encontrado.');
    return turno;
  }

  /** TUR-008: lazy-expira la reserva temporal vencida (CUU02 alt 4.a). */
  private async expirarSiVencido(turno: Turno): Promise<void> {
    if (this.estaVencidaLaReserva(turno)) {
      turno.estado = EstadoTurno.NO_CONFIRMADO;
      await this.turnosRepo.save(turno);
    }
  }

  private estaVencidaLaReserva(turno: Turno): boolean {
    return (
      turno.estado === EstadoTurno.SOLICITADO &&
      !!turno.reservaExpiraEn &&
      turno.reservaExpiraEn.getTime() < Date.now()
    );
  }

  private esDiaLaborable(fecha: string): boolean {
    // `fecha` es una fecha calendario sin huso horario: se fija a UTC para
    // que el día de semana no dependa del huso horario del servidor.
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return dia >= 1 && dia <= 5;
  }

  /** RN12/RN13/RN22: el PACIENTE sólo puede actuar con >= 24h de anticipación. */
  private verificarPlazo(turno: Turno, solicitante: Solicitante, accion: 'cancelar' | 'reprogramar'): void {
    if (solicitante.rol !== Rol.PACIENTE) return;
    const fechaHoraTurno = new Date(`${turno.fecha}T${turno.hora}:00`);
    const horasRestantes = (fechaHoraTurno.getTime() - Date.now()) / 3_600_000;
    if (horasRestantes < 24) {
      const mensaje =
        accion === 'cancelar'
          ? 'No es posible cancelar el turno con menos de 24 horas de anticipación.'
          : 'No es posible reprogramar el turno con menos de 24 horas de anticipación.';
      throw new ConflictException(mensaje);
    }
  }

  /** Nunca confiar en el id de la URL/body: comparar contra el dueño real del turno. */
  private async verificarAccesoPropioOStaff(turno: Turno, solicitante: Solicitante): Promise<void> {
    if (solicitante.rol === Rol.ASISTENTE || solicitante.rol === Rol.DUENO) return;
    if (solicitante.rol === Rol.PROFESIONAL) {
      if (turno.profesionalId !== (await this.resolverProfesionalIdDelSub(solicitante.sub))) {
        throw new ForbiddenException('No tenés acceso a este turno.');
      }
      return;
    }
    const pacienteId = await this.resolverPacienteIdDelSub(solicitante.sub);
    if (turno.pacienteId !== pacienteId) {
      throw new ForbiddenException('No tenés acceso a este turno.');
    }
  }

  /** PROFESIONAL logueado: resuelve su `Profesional.id` real a partir del `sub` del JWT. */
  private async resolverProfesionalIdDelSub(usuarioId: string): Promise<string> {
    const profesional = await this.profesionalesClient.porUsuario(usuarioId);
    if (!profesional) {
      throw new HttpException(
        'No se pudo identificar el perfil de profesional asociado a su usuario.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return profesional.id;
  }

  /** PACIENTE logueado: resuelve su `Paciente.id` real a partir del `sub` del JWT. */
  private async resolverPacienteIdDelSub(usuarioId: string): Promise<string> {
    const paciente = await this.pacientesClient.porUsuario(usuarioId);
    if (!paciente) {
      throw new HttpException(
        'No se pudo identificar el perfil de paciente asociado a su usuario.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return paciente.id;
  }

  private async resolverPacienteIdParaCreacion(
    dto: SolicitarTurnoDto,
    solicitante: Solicitante,
  ): Promise<string> {
    if (solicitante.rol === Rol.PACIENTE) {
      return this.resolverPacienteIdDelSub(solicitante.sub);
    }
    if (!dto.pacienteId) {
      throw new BadRequestException('Debe indicar el paciente para el que se solicita el turno.');
    }
    return dto.pacienteId;
  }

  private aDto(turno: Turno): TurnoDto {
    return {
      id: turno.id,
      pacienteId: turno.pacienteId,
      profesionalId: turno.profesionalId,
      servicioId: turno.servicioId,
      fecha: turno.fecha,
      hora: turno.hora,
      estado: turno.estado,
      monto: Number(turno.monto),
      pagoId: turno.pagoId,
      comprobanteNumero: turno.comprobanteNumero,
      reservaExpiraEn: turno.reservaExpiraEn?.toISOString() ?? null,
      motivoCancelacion: turno.motivoCancelacion,
      origen: turno.origen,
    };
  }
}
