import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import {
  EstadoPaciente,
  Rol,
  AltaPor,
  Paciente as PacienteDto,
  PacienteResumen,
} from '@syssalud/shared-types';
import { Paciente } from './entities/paciente.entity';
import { CrearPacienteDto } from './dto/crear-paciente.dto';
import { AltaPerfilPacienteDto } from './dto/alta-perfil-paciente.dto';
import { ActualizarPacienteDto } from './dto/actualizar-paciente.dto';
import { AuthClient } from './clients/auth.client';
import { NotificacionesClient } from './clients/notificaciones.client';

type ModoValidacionAuth = 'lenient' | 'strict';
type DatosPersonales = {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  domicilio: string;
};

@Injectable()
export class PacientesService {
  private readonly modoValidacion: ModoValidacionAuth;

  constructor(
    @InjectRepository(Paciente)
    private readonly pacientesRepo: Repository<Paciente>,
    private readonly dataSource: DataSource,
    private readonly authClient: AuthClient,
    private readonly notificacionesClient: NotificacionesClient,
    private readonly config: ConfigService,
  ) {
    this.modoValidacion = this.config.get<ModoValidacionAuth>(
      'PACIENTES_VALIDAR_AUTH',
      'lenient',
    );
  }

  async estado() {
    return {
      modulo: 'pacientes',
      dependencias: { auth: 'auth', notificaciones: 'notificaciones' },
      modoValidacion: this.modoValidacion,
    };
  }

  async registrarPorAsistente(dto: CrearPacienteDto): Promise<PacienteDto> {
    await this.verificarDniNoDuplicado(dto.dni);

    const usuario = await this.authClient.crearUsuario({
      ...dto,
      rol: 'PACIENTE',
    });

    if (!usuario && this.modoValidacion === 'strict') {
      throw new BadRequestException(
        'No se pudo generar el usuario del paciente (Auth no disponible).',
      );
    }

    const paciente = await this.crearRegistro({
      usuarioId: usuario?.id ?? null,
      estado: usuario
        ? EstadoPaciente.ACTIVO
        : EstadoPaciente.PENDIENTE_CREDENCIALES,
      altaPor: AltaPor.ADM,
      dni: dto.dni,
      nombre: dto.nombre,
      apellido: dto.apellido,
    });

    await this.notificacionesClient.enviar(
      dto.email,
      `Paciente registrado. Detalles: ${dto.nombre} ${paciente.numeroPaciente}`,
    );

    return this.aDto(paciente, dto);
  }

  async registrarDesdeAutorregistro(
    dto: AltaPerfilPacienteDto,
  ): Promise<PacienteDto> {
    const existente = await this.pacientesRepo.findOne({
      where: { usuarioId: dto.usuarioId },
    });
    if (existente) return this.aDto(existente, dto);

    await this.verificarDniNoDuplicado(dto.dni);

    const paciente = await this.crearRegistro({
      usuarioId: dto.usuarioId,
      estado: EstadoPaciente.ACTIVO,
      altaPor: AltaPor.AUTORREGISTRO,
      dni: dto.dni,
      nombre: dto.nombre,
      apellido: dto.apellido,
    });

    return this.aDto(paciente, dto);
  }

  async buscar(params: {
    buscar?: string;
    pagina?: number;
    porPagina?: number;
  }): Promise<PacienteResumen[]> {
    const pagina = params.pagina && params.pagina > 0 ? params.pagina : 1;
    const porPagina =
      params.porPagina && params.porPagina > 0 ? params.porPagina : 20;

    const qb = this.pacientesRepo
      .createQueryBuilder('p')
      .where('p.estado != :inactivo', { inactivo: EstadoPaciente.INACTIVO });

    if (params.buscar) {
      qb.andWhere('(p.dni ILIKE :q OR p.apellido ILIKE :q)', {
        q: `%${params.buscar}%`,
      });
    }

    const pacientes = await qb
      .orderBy('p.apellido', 'ASC')
      .skip((pagina - 1) * porPagina)
      .take(porPagina)
      .getMany();

    return pacientes.map((p) => ({
      id: p.id,
      numeroPaciente: p.numeroPaciente,
      nombreCompleto: `${p.nombre} ${p.apellido}`,
      dni: p.dni,
    }));
  }

  async obtenerPorId(
    id: string,
    solicitante: { sub: string; rol: Rol },
  ): Promise<PacienteDto> {
    const paciente = await this.pacientesRepo.findOne({ where: { id } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    this.verificarAccesoPropioOStaff(paciente, solicitante);

    const [usuario] = paciente.usuarioId
      ? await this.authClient.obtenerUsuarios([paciente.usuarioId])
      : [undefined];

    return this.aDto(paciente, usuario);
  }

  async obtenerPorUsuarioId(usuarioId: string): Promise<PacienteDto> {
    const paciente = await this.pacientesRepo.findOne({ where: { usuarioId } });
    if (!paciente)
      throw new NotFoundException(
        'No hay perfil de paciente para ese usuario.',
      );

    const [usuario] = await this.authClient.obtenerUsuarios([usuarioId]);
    return this.aDto(paciente, usuario);
  }

  async actualizar(
    id: string,
    dto: ActualizarPacienteDto,
    solicitante: { sub: string; rol: Rol },
  ): Promise<PacienteDto> {
    const paciente = await this.pacientesRepo.findOne({ where: { id } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    this.verificarAccesoPropioOStaff(paciente, solicitante);

    const esElPropioPaciente = solicitante.sub === paciente.usuarioId;
    if (esElPropioPaciente && dto.estado) {
      throw new ForbiddenException(
        'El paciente no puede modificar su propio estado.',
      );
    }

    if (dto.estado) {
      paciente.estado = dto.estado;
      await this.pacientesRepo.save(paciente);
    }

    if (paciente.usuarioId && (dto.telefono || dto.email || dto.domicilio)) {
      await this.authClient.actualizarContacto(paciente.usuarioId, {
        telefono: dto.telefono,
        email: dto.email,
        domicilio: dto.domicilio,
      });
    }

    return this.obtenerPorId(id, solicitante);
  }

  async verificarRegistrado(
    id: string,
  ): Promise<{ registrado: boolean; estado: EstadoPaciente }> {
    const paciente = await this.pacientesRepo.findOne({ where: { id } });
    if (!paciente) throw new NotFoundException('Paciente no encontrado.');

    return {
      registrado: paciente.estado === EstadoPaciente.ACTIVO,
      estado: paciente.estado,
    };
  }

  private async verificarDniNoDuplicado(dni: string): Promise<void> {
    const existente = await this.pacientesRepo.findOne({ where: { dni } });
    if (existente) {
      throw new ConflictException(
        'Un paciente con este DNI ya se encuentra registrado.',
      );
    }
  }

  private async crearRegistro(datos: {
    usuarioId: string | null;
    estado: EstadoPaciente;
    altaPor: AltaPor;
    dni: string;
    nombre: string;
    apellido: string;
  }): Promise<Paciente> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Paciente);
      const { max } = await repo
        .createQueryBuilder('p')
        .select('MAX(p.numeroPaciente)', 'max')
        .setLock('pessimistic_write')
        .getRawOne<{ max: number | null }>();

      const paciente = repo.create({
        ...datos,
        numeroPaciente: (max ?? 0) + 1,
      });
      return repo.save(paciente);
    });
  }

  private verificarAccesoPropioOStaff(
    paciente: Paciente,
    solicitante: { sub: string; rol: Rol },
  ): void {
    const esStaff =
      solicitante.rol === Rol.ASISTENTE || solicitante.rol === Rol.PROFESIONAL;
    const esElPropioPaciente = solicitante.sub === paciente.usuarioId;
    if (!esStaff && !esElPropioPaciente) {
      throw new ForbiddenException('No tenés acceso a este paciente.');
    }
  }

  private aDto(
    paciente: Paciente,
    datosUsuario?: Partial<DatosPersonales>,
  ): PacienteDto {
    return {
      id: paciente.id,
      numeroPaciente: paciente.numeroPaciente,
      estado: paciente.estado,
      usuarioId: paciente.usuarioId,
      nombre: datosUsuario?.nombre ?? paciente.nombre,
      apellido: datosUsuario?.apellido ?? paciente.apellido,
      dni: datosUsuario?.dni ?? paciente.dni,
      fechaNacimiento: datosUsuario?.fechaNacimiento ?? '',
      telefono: datosUsuario?.telefono ?? '',
      email: datosUsuario?.email ?? '',
      domicilio: datosUsuario?.domicilio ?? '',
      fechaAlta:
        paciente.fechaAlta?.toISOString?.() ?? String(paciente.fechaAlta),
    };
  }
}
