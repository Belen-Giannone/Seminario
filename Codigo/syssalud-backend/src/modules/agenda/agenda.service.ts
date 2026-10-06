import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgendaItem,
  AgendaProfesional,
  BLOQUE_AGENDA_MIN,
  Rol,
  SlotDisponible,
  TurnoResumen,
} from '@syssalud/shared-types';
import { PacientesClient } from './clients/pacientes.client';
import { ProfesionalesClient } from './clients/profesionales.client';
import { TurnosClient } from './clients/turnos.client';
import { ServiciosClient } from './clients/servicios.client';
import { FeriadosClient } from './clients/feriados.client';
import { calcularDisponibilidad } from './agenda-calculo.util';
import { ConsultarAgendaQueryDto } from './dto/consultar-agenda.dto';
import { DisponibilidadQueryDto } from './dto/disponibilidad.dto';

type Modo = 'lenient' | 'strict';

interface CacheEntry {
  expira: number;
  valor: unknown;
}

/**
 * Lógica de CUU05 (Consultar agenda) y de la disponibilidad que consumen
 * CUU02/CUU04. AGE-005: sin entidad propia, todo se recalcula on-demand a
 * partir de las costuras con Profesionales, Turnos, Servicios y Feriados
 * (AGE-001: nunca se inyectan sus services, sólo REST).
 */
@Injectable()
export class AgendaService {
  private readonly modo: Modo =
    process.env.AGENDA_MODO === 'strict' ? 'strict' : 'lenient';
  private readonly cacheTtlMs =
    (Number(process.env.AGENDA_CACHE_TTL_S) || 60) * 1000;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly profesionalesClient: ProfesionalesClient,
    private readonly turnosClient: TurnosClient,
    private readonly serviciosClient: ServiciosClient,
    private readonly feriadosClient: FeriadosClient,
    private readonly pacientesClient: PacientesClient,
  ) {}

  /** `GET /api/agenda/_estado` (AGE-004). */
  estado() {
    return {
      modulo: 'agenda',
      dependencias: {
        profesionales: process.env.PROFESIONALES_API_URL
          ? 'configurada'
          : 'default (localhost:4000/api)',
        turnos: process.env.TURNOS_API_URL
          ? 'configurada'
          : 'default (localhost:4000/api)',
        servicios: process.env.SERVICIOS_API_URL
          ? 'configurada'
          : 'default (localhost:4000/api)',
        feriados: process.env.FERIADOS_API_URL
          ? 'configurada'
          : 'dataset local',
      },
      modo: this.modo,
    };
  }

  /**
   * CUU05 - Consultar agenda de un profesional (AGE-012/AGE-014).
   * `PROFESIONAL` sólo ve la propia: se ignora `profesionalIdParam` y se usa
   * el `Profesional` asociado a su usuario (`user.sub` es el id de `Usuario`).
   */
  async agendaDe(
    profesionalIdParam: string,
    query: ConsultarAgendaQueryDto,
    user: { sub: string; rol: Rol },
  ): Promise<AgendaProfesional> {
    const profesionalId =
      user.rol === Rol.PROFESIONAL
        ? await this.profesionalDelUsuario(user.sub)
        : profesionalIdParam;

    const existencia = await this.profesionalesClient.existe(profesionalId);
    if (existencia.estado === 'no') {
      // CUU05 alt. 1.b
      throw new NotFoundException('El profesional no está registrado.');
    }
    if (existencia.estado === 'desconocido' && this.modo === 'strict') {
      throw new HttpException(
        'No se pudo validar el profesional: la dependencia Profesionales no está disponible.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const cacheKey = `agenda:${profesionalId}:${query.desde}:${query.hasta}`;
    const cacheado = this.leerCache<AgendaProfesional>(cacheKey);
    if (cacheado) {
      return cacheado;
    }

    const { turnos, parcial } = await this.turnosClient.ocupacion(
      profesionalId,
      query.desde,
      query.hasta,
    );
    if (parcial && this.modo === 'strict') {
      throw new HttpException(
        'No se pudo obtener la ocupación de turnos: la dependencia Turnos no está disponible.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const items = await this.aItems(turnos);
    const resultado: AgendaProfesional = {
      idProf: profesionalId,
      profesionalNombre: existencia.estado === 'si' ? existencia.nombre : null,
      periodo: { desde: query.desde, hasta: query.hasta, tipo: query.periodo },
      items,
      ocupacionParcial: parcial || undefined,
      // CUU05 alt. 1.a
      mensaje:
        items.length === 0 ? 'No existen turnos en la agenda.' : undefined,
    };

    this.guardarCache(cacheKey, resultado);
    return resultado;
  }

  /** `Profesional.id` del usuario PROFESIONAL logueado. */
  private async profesionalDelUsuario(usuarioId: string): Promise<string> {
    const id = await this.profesionalesClient.idPorUsuario(usuarioId);
    if (id === null) {
      throw new NotFoundException(
        'Su usuario no tiene un perfil de profesional registrado.',
      );
    }
    if (id === undefined) {
      throw new HttpException(
        'No se pudo identificar su perfil de profesional: la dependencia Profesionales no está disponible.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }
    return id;
  }

  /** Completa paciente y servicio de cada turno (best-effort, AGE-002). */
  private async aItems(turnos: TurnoResumen[]): Promise<AgendaItem[]> {
    const servicioIds = [
      ...new Set(turnos.map((t) => t.servicioId).filter(Boolean)),
    ];
    const [pacientes, servicios] = await Promise.all([
      this.pacientesClient.nombres(turnos.map((t) => t.pacienteId)),
      Promise.all(
        servicioIds.map(
          async (id) =>
            [id, (await this.serviciosClient.obtener(id))?.nombre] as const,
        ),
      ),
    ]);
    const nombreServicio = new Map(servicios);
    return turnos.map((t) => ({
      idTurno: t.idTurno,
      fecha: t.fecha,
      hora: t.hora,
      estado: t.estado,
      pacienteNombre: pacientes.get(t.pacienteId) ?? null,
      servicioNombre: nombreServicio.get(t.servicioId) ?? null,
    }));
  }

  /**
   * Slots libres para agendar un turno (AGE-013). Lo consumen Turnos (CUU02/CUU04,
   * RN09) y el Frontend. Lista vacía = sin disponibilidad, no es error (RN19).
   */
  async disponibilidad(
    profesionalId: string,
    consulta: DisponibilidadQueryDto,
  ): Promise<SlotDisponible[]> {
    // Turnos consulta un solo día con `?fecha=`; el frontend, un rango.
    const query = {
      servicioId: consulta.servicioId,
      desde: consulta.desde ?? consulta.fecha,
      hasta: consulta.hasta ?? consulta.fecha,
    };
    const cacheKey = `disp:${profesionalId}:${query.servicioId}:${query.desde}:${query.hasta}`;
    const cacheado = this.leerCache<SlotDisponible[]>(cacheKey);
    if (cacheado) {
      return cacheado;
    }

    const horarios = await this.profesionalesClient.horariosDe(profesionalId);
    if (horarios === null && this.modo === 'strict') {
      throw new HttpException(
        'No se pudieron obtener los horarios del profesional: la dependencia Profesionales no está disponible.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const [servicio, ocupacion, feriados] = await Promise.all([
      this.serviciosClient.obtener(query.servicioId),
      this.turnosClient.ocupacion(profesionalId, query.desde, query.hasta),
      this.feriadosClient.enRango(query.desde, query.hasta),
    ]);

    if (ocupacion.parcial && this.modo === 'strict') {
      throw new HttpException(
        'No se pudo obtener la ocupación de turnos: la dependencia Turnos no está disponible.',
        HttpStatus.FAILED_DEPENDENCY,
      );
    }

    const ocupados = new Set(
      ocupacion.turnos.map((turno) => `${turno.fecha} ${turno.hora}`),
    );

    const slots = calcularDisponibilidad({
      horarios: horarios ?? [],
      ocupados,
      feriados,
      desde: query.desde,
      hasta: query.hasta,
      duracionMin: servicio?.duracionMin ?? BLOQUE_AGENDA_MIN,
      bloqueMin: BLOQUE_AGENDA_MIN,
    });

    this.guardarCache(cacheKey, slots);
    return slots;
  }

  /** Caché corta por (recurso, rango) para no golpear las costuras en cada request (AGE-019). */
  private leerCache<T>(key: string): T | undefined {
    const entrada = this.cache.get(key);
    if (!entrada) {
      return undefined;
    }
    if (entrada.expira < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entrada.valor as T;
  }

  private guardarCache(key: string, valor: unknown): void {
    if (this.cacheTtlMs <= 0) {
      return;
    }
    this.cache.set(key, { expira: Date.now() + this.cacheTtlMs, valor });
  }
}
