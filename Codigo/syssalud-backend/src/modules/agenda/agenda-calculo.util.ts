import { HorarioAtencion, SlotDisponible } from '@syssalud/shared-types';

/** Cálculo puro de la rejilla de disponibilidad (AGE-006/007/008), sin I/O — testeable en aislamiento. */

function parseFechaUTC(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 1=lunes ... 7=domingo (ISO), a partir de una fecha "YYYY-MM-DD". */
export function diaIsoSemana(fecha: string): number {
  const dow = parseFechaUTC(fecha).getUTCDay(); // 0=domingo..6=sábado
  return dow === 0 ? 7 : dow;
}

/** RN07: sólo lunes a viernes. */
export function esDiaHabil(fecha: string): boolean {
  const iso = diaIsoSemana(fecha);
  return iso >= 1 && iso <= 5;
}

/** Todas las fechas "YYYY-MM-DD" entre `desde` y `hasta`, inclusive. */
export function enumerarFechas(desde: string, hasta: string): string[] {
  const inicio = parseFechaUTC(desde);
  const fin = parseFechaUTC(hasta);
  const fechas: string[] = [];
  for (let d = inicio.getTime(); d <= fin.getTime(); d += 86_400_000) {
    fechas.push(new Date(d).toISOString().slice(0, 10));
  }
  return fechas;
}

export function minutosDesdeMedianoche(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function formatearHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export interface CalcularDisponibilidadParams {
  horarios: HorarioAtencion[];
  /** claves `"YYYY-MM-DD HH:mm"` ya ocupadas (AGE-007). */
  ocupados: Set<string>;
  /** fechas "YYYY-MM-DD" feriado (RN08). */
  feriados: Set<string>;
  desde: string;
  hasta: string;
  duracionMin: number;
  bloqueMin: number;
}

/**
 * Rejilla de slots libres para un rango de fechas (AGE-006/007/008).
 * Excluye fines de semana (RN07) y feriados (RN08); descuenta ocupación (RN09);
 * sólo ofrece inicios de bloque cuyo bloque completo (`duracionMin`) entra antes
 * del fin de la franja. Lista vacía = sin disponibilidad (RN19), no es error.
 */
export function calcularDisponibilidad(
  params: CalcularDisponibilidadParams,
): SlotDisponible[] {
  const { horarios, ocupados, feriados, duracionMin, bloqueMin } = params;
  const slots: SlotDisponible[] = [];

  for (const fecha of enumerarFechas(params.desde, params.hasta)) {
    if (!esDiaHabil(fecha) || feriados.has(fecha)) {
      continue;
    }

    const diaSemana = diaIsoSemana(fecha);
    const horariosDelDia = horarios.filter((h) => h.diaSemana === diaSemana);

    for (const franja of horariosDelDia) {
      const inicioFranja = minutosDesdeMedianoche(franja.horaInicio);
      const finFranja = minutosDesdeMedianoche(franja.horaFin);

      for (
        let inicio = inicioFranja;
        inicio + bloqueMin <= finFranja;
        inicio += bloqueMin
      ) {
        if (inicio + duracionMin > finFranja) {
          continue; // AGE-008: no cabe entero antes del fin de la franja
        }

        let libre = true;
        for (let t = inicio; t < inicio + duracionMin; t += bloqueMin) {
          if (ocupados.has(`${fecha} ${formatearHora(t)}`)) {
            libre = false;
            break;
          }
        }

        if (libre) {
          slots.push({ fecha, hora: formatearHora(inicio) });
        }
      }
    }
  }

  return slots;
}
