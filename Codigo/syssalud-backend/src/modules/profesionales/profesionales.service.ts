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
import { Repository } from 'typeorm';
import {
  HorarioAtencion as HorarioAtencionDto,
  HorarioAtencionInput,
  Profesional as ProfesionalDto,
  ProfesionalResumen,
  Rol,
} from '@syssalud/shared-types';
import { Profesional } from './entities/profesional.entity';
import { HorarioAtencion } from './entities/horario-atencion.entity';
import { CrearProfesionalDto } from './dto/crear-profesional.dto';
import { DefinirHorariosDto } from './dto/definir-horarios.dto';
import { ActualizarProfesionalDto } from './dto/actualizar-profesional.dto';
import { AuthClient } from './clients/auth.client';

type ModoValidacionAuth = 'lenient' | 'strict';
type Solicitante = { sub: string; rol: Rol };

/**
 * PRO-005: sin acoplamiento en proceso con otros feature modules (PRO-001).
 * La única costura es `AuthClient` (hacia el módulo plataforma Auth, mismo
 * criterio que usa Pacientes). Agenda/Turnos/Métricas consumen este módulo
 * exclusivamente por REST (`GET /api/profesionales/:id/horarios`, etc.),
 * nunca por inyección directa de este service.
 */
@Injectable()
export class ProfesionalesService {
  private readonly modoValidacion: ModoValidacionAuth;

  constructor(
    @InjectRepository(Profesional)
    private readonly profesionalesRepo: Repository<Profesional>,
    @InjectRepository(HorarioAtencion)
    private readonly horariosRepo: Repository<HorarioAtencion>,
    private readonly authClient: AuthClient,
    private readonly config: ConfigService,
  ) {
    this.modoValidacion = this.config.get<ModoValidacionAuth>(
      'PROFESIONALES_VALIDAR_AUTH',
      'lenient',
    );
  }

  /** PRO-004 */
  estado() {
    return {
      modulo: 'profesionales',
      dependencias: { auth: 'auth' },
      modoValidacion: this.modoValidacion,
    };
  }

  /** PRO-012 — alta en un paso: crea el `Usuario` en Auth + el `Profesional`. */
  async crear(
    dto: CrearProfesionalDto,
  ): Promise<{ profesional: ProfesionalDto; passwordInicial: string | null }> {
    await this.verificarMatriculaLibre(dto.matricula);
    if (dto.horarios?.length) this.validarHorarios(dto.horarios);

    const usuario = await this.authClient.crearUsuario({
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      dni: dto.dni,
    });

    if (!usuario && this.modoValidacion === 'strict') {
      throw new HttpException(
        'No se pudo crear el usuario del profesional (Auth no disponible).',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const profesional = await this.profesionalesRepo.save(
      this.profesionalesRepo.create({
        usuarioId: usuario?.id ?? null,
        especialidad: dto.especialidad,
        matricula: dto.matricula,
      }),
    );

    if (dto.horarios?.length) {
      await this.horariosRepo.save(
        dto.horarios.map((h) =>
          this.horariosRepo.create({ ...h, profesionalId: profesional.id }),
        ),
      );
    }

    const completo = await this.buscarEntidadOFallar(profesional.id);
    return {
      profesional: await this.aDto(completo, {
        nombre: dto.nombre,
        apellido: dto.apellido,
        email: dto.email,
      }),
      passwordInicial: usuario?.passwordInicial ?? null,
    };
  }

  /** PRO-013 — `?ids=` (costura de Servicios, SER-021) y `?activos=`. */
  async listar(params: {
    ids?: string[];
    activos?: boolean;
  }): Promise<ProfesionalResumen[]> {
    const qb = this.profesionalesRepo.createQueryBuilder('p');
    if (params.ids?.length)
      qb.andWhere('p.id IN (:...ids)', { ids: params.ids });
    if (params.activos !== undefined)
      qb.andWhere('p.activo = :activos', { activos: params.activos });

    const profesionales = await qb.getMany();
    const usuarios = await this.authClient.obtenerUsuarios(
      profesionales.map((p) => p.usuarioId).filter((id): id is string => !!id),
    );
    const porUsuarioId = new Map(usuarios.map((u) => [u.id, u]));

    return profesionales.map((p) =>
      this.aResumen(p, p.usuarioId ? porUsuarioId.get(p.usuarioId) : undefined),
    );
  }

  /** PRO-014 — detalle. `404` "El profesional no está registrado." (CUU05 alt 1.b). */
  async buscarPorId(id: string): Promise<ProfesionalDto> {
    const profesional = await this.buscarEntidadOFallar(id);
    return this.aDto(profesional);
  }

  /** PRO-015 — costura entrante de Agenda. */
  async horariosDe(id: string): Promise<HorarioAtencionDto[]> {
    await this.buscarEntidadOFallar(id);
    return this.horariosRepo.find({ where: { profesionalId: id } });
  }

  /** PRO-018 — resolución `sub` → `profesionalId` para Agenda/Métricas/Historia Clínica. */
  async porUsuario(usuarioId: string): Promise<{ id: string }> {
    const profesional = await this.profesionalesRepo.findOne({
      where: { usuarioId },
    });
    if (!profesional)
      throw new NotFoundException('El profesional no está registrado.');
    return { id: profesional.id };
  }

  /** PRO-016 — reemplaza el set completo. Sólo ASISTENTE/DUEÑO o el propio profesional. */
  async definirHorarios(
    id: string,
    dto: DefinirHorariosDto,
    solicitante: Solicitante,
  ): Promise<HorarioAtencionDto[]> {
    const profesional = await this.buscarEntidadOFallar(id);
    this.verificarAccesoPropioOStaff(profesional, solicitante);
    this.validarHorarios(dto.horarios);

    await this.horariosRepo.delete({ profesionalId: id });
    const creados = await this.horariosRepo.save(
      dto.horarios.map((h) =>
        this.horariosRepo.create({ ...h, profesionalId: id }),
      ),
    );
    return creados;
  }

  /** PRO-017 — edición y baja lógica. */
  async actualizar(
    id: string,
    dto: ActualizarProfesionalDto,
  ): Promise<ProfesionalDto> {
    const profesional = await this.buscarEntidadOFallar(id);

    if (dto.matricula && dto.matricula !== profesional.matricula) {
      await this.verificarMatriculaLibre(dto.matricula);
      profesional.matricula = dto.matricula;
    }
    if (dto.especialidad) profesional.especialidad = dto.especialidad;
    if (dto.activo !== undefined) profesional.activo = dto.activo;

    await this.profesionalesRepo.save(profesional);
    return this.aDto(profesional);
  }

  // ---- privados ----

  private async buscarEntidadOFallar(id: string): Promise<Profesional> {
    const profesional = await this.profesionalesRepo.findOne({
      where: { id },
      relations: ['horarios'],
    });
    if (!profesional)
      throw new NotFoundException('El profesional no está registrado.');
    return profesional;
  }

  private async verificarMatriculaLibre(matricula: string): Promise<void> {
    const existente = await this.profesionalesRepo.findOne({
      where: { matricula },
    });
    if (existente)
      throw new ConflictException(
        'Ya existe un profesional con esa matrícula.',
      );
  }

  /** RN07 ya es estructural (el enum `DiaSemana` no tiene sábado/domingo); PRO-022: horas y solapamiento. */
  private validarHorarios(horarios: HorarioAtencionInput[]): void {
    for (const h of horarios) {
      if (h.horaInicio >= h.horaFin) {
        throw new BadRequestException(
          `La hora de inicio (${h.horaInicio}) debe ser anterior a la hora de fin (${h.horaFin}).`,
        );
      }
    }
    for (let i = 0; i < horarios.length; i++) {
      for (let j = i + 1; j < horarios.length; j++) {
        const a = horarios[i];
        const b = horarios[j];
        if (a.diaSemana !== b.diaSemana) continue;
        const seSuperponen =
          a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
        if (seSuperponen) {
          throw new BadRequestException(
            `Las franjas del día ${a.diaSemana} se superponen (${a.horaInicio}-${a.horaFin} y ${b.horaInicio}-${b.horaFin}).`,
          );
        }
      }
    }
  }

  /** Nunca confiar en el `:id` de la URL: sólo ASISTENTE/DUEÑO o el propio profesional (PRO-016). */
  private verificarAccesoPropioOStaff(
    profesional: Profesional,
    solicitante: Solicitante,
  ): void {
    const esStaff =
      solicitante.rol === Rol.ASISTENTE || solicitante.rol === Rol.DUENO;
    const esElPropioProfesional = solicitante.sub === profesional.usuarioId;
    if (!esStaff && !esElPropioProfesional) {
      throw new ForbiddenException('No tenés acceso a este profesional.');
    }
  }

  private aResumen(
    profesional: Profesional,
    usuario?: { nombre: string; apellido: string },
  ): ProfesionalResumen {
    return {
      id: profesional.id,
      nombreCompleto: usuario ? `${usuario.nombre} ${usuario.apellido}` : '',
      especialidad: profesional.especialidad,
      activo: profesional.activo,
    };
  }

  private async aDto(
    profesional: Profesional,
    datosNuevoUsuario?: { nombre: string; apellido: string; email: string },
  ): Promise<ProfesionalDto> {
    const [usuario] =
      !datosNuevoUsuario && profesional.usuarioId
        ? await this.authClient.obtenerUsuarios([profesional.usuarioId])
        : [undefined];

    return {
      id: profesional.id,
      usuarioId: profesional.usuarioId,
      nombreCompleto: datosNuevoUsuario
        ? `${datosNuevoUsuario.nombre} ${datosNuevoUsuario.apellido}`
        : usuario
          ? `${usuario.nombre} ${usuario.apellido}`
          : '',
      email: datosNuevoUsuario?.email ?? usuario?.email ?? '',
      especialidad: profesional.especialidad,
      matricula: profesional.matricula,
      activo: profesional.activo,
      horarios: profesional.horarios ?? [],
    };
  }
}
