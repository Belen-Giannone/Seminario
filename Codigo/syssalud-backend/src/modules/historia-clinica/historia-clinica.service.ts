import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

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

/**
 * CUU09 - Gestionar historia clínica (RN02, RN10).
 * Primera versión didáctica en memoria. La persistencia y las costuras REST
 * se incorporarán en una etapa posterior sin cambiar el contrato del controller.
 */
@Injectable()
export class HistoriaClinicaService {
  private readonly historias = new Map<string, HistoriaClinica>();
  private readonly modoValidacion = process.env.HISTORIA_VALIDAR_TURNOS === 'strict' ? 'strict' : 'lenient';

  estado() {
    return {
      modulo: 'historia-clinica',
      dependencias: { pacientes: 'no conectada', turnos: 'no conectada' },
      modoValidacion: this.modoValidacion,
    };
  }

  inicializar(pacienteId: string): HistoriaClinica {
    const existente = this.historias.get(pacienteId);
    if (existente) return existente;
    const historia: HistoriaClinica = {
      idHistoria: crypto.randomUUID(),
      pacienteId,
      nomAppPac: null,
      telefono: null,
      correo: null,
      entradas: [],
    };
    this.historias.set(pacienteId, historia);
    return historia;
  }

  buscar(criterio: string): HistoriaClinica {
    const historia = [...this.historias.values()].find((item) =>
      item.pacienteId === criterio || item.nomAppPac?.toLowerCase().includes(criterio.toLowerCase()),
    );
    if (!historia) throw new NotFoundException('No se encontraron pacientes con los criterios ingresados.');
    return historia;
  }

  obtener(pacienteId: string): HistoriaClinica {
    const historia = this.historias.get(pacienteId);
    if (!historia) throw new NotFoundException('El paciente no cuenta con una historia clínica previa');
    return historia;
  }

  agregarEntrada(
    pacienteId: string,
    profesionalId: string,
    dto: { observaciones: string; antecedentes: string; tratamientos: string; turnoId?: string },
  ): EntradaClinica {
    if (![dto.observaciones, dto.antecedentes, dto.tratamientos].some((campo) => campo.trim())) {
      throw new ConflictException('Debe completar al menos un campo clínico');
    }

    const historia = this.historias.get(pacienteId);
    if (!historia) throw new NotFoundException('El paciente no cuenta con una historia clínica previa');
    if (this.modoValidacion === 'strict' && !dto.turnoId) {
      throw new ConflictException('No existe una consulta asistida asociada');
    }
    const entrada: EntradaClinica = {
      id: crypto.randomUUID(),
      turnoId: dto.turnoId ?? null,
      profesionalId,
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: dto.observaciones.trim(),
      antecedentes: dto.antecedentes.trim(),
      tratamientos: dto.tratamientos.trim(),
      fechaActualizacion: new Date().toISOString(),
    };
    historia.entradas.unshift(entrada);
    return entrada;
  }
}
