import { HorarioAtencion } from '@syssalud/shared-types';
import {
  calcularDisponibilidad,
  diaIsoSemana,
  enumerarFechas,
  esDiaHabil,
} from './agenda-calculo.util';

// 2026-09-14 es lunes; 2026-09-19/20 sábado/domingo (AGE-029).
const LUNES = '2026-09-14';
const SABADO = '2026-09-19';
const DOMINGO = '2026-09-20';

describe('agenda-calculo.util', () => {
  describe('esDiaHabil / diaIsoSemana', () => {
    it('identifica lunes a viernes como hábiles', () => {
      expect(diaIsoSemana(LUNES)).toBe(1);
      expect(esDiaHabil(LUNES)).toBe(true);
    });

    it('excluye sábado y domingo (RN07)', () => {
      expect(esDiaHabil(SABADO)).toBe(false);
      expect(esDiaHabil(DOMINGO)).toBe(false);
    });
  });

  describe('enumerarFechas', () => {
    it('incluye ambos extremos del rango', () => {
      expect(enumerarFechas(LUNES, '2026-09-16')).toEqual([
        '2026-09-14',
        '2026-09-15',
        '2026-09-16',
      ]);
    });
  });

  describe('calcularDisponibilidad', () => {
    const horarioLunes09a10: HorarioAtencion[] = [
      { diaSemana: 1, horaInicio: '09:00', horaFin: '10:00' },
    ];

    it('arma la rejilla del bloque de agenda dentro de la franja', () => {
      const slots = calcularDisponibilidad({
        horarios: horarioLunes09a10,
        ocupados: new Set(),
        feriados: new Set(),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 15,
        bloqueMin: 15,
      });

      expect(slots).toEqual([
        { fecha: LUNES, hora: '09:00' },
        { fecha: LUNES, hora: '09:15' },
        { fecha: LUNES, hora: '09:30' },
        { fecha: LUNES, hora: '09:45' },
      ]);
    });

    it('excluye sábado y domingo aunque haya franjas cargadas para ese día (RN07)', () => {
      const horarioSabado: HorarioAtencion[] = [
        { diaSemana: 6, horaInicio: '09:00', horaFin: '10:00' },
      ];
      const slots = calcularDisponibilidad({
        horarios: horarioSabado,
        ocupados: new Set(),
        feriados: new Set(),
        desde: SABADO,
        hasta: DOMINGO,
        duracionMin: 15,
        bloqueMin: 15,
      });
      expect(slots).toEqual([]);
    });

    it('excluye un feriado (RN08)', () => {
      const slots = calcularDisponibilidad({
        horarios: horarioLunes09a10,
        ocupados: new Set(),
        feriados: new Set([LUNES]),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 15,
        bloqueMin: 15,
      });
      expect(slots).toEqual([]);
    });

    it('descuenta la ocupación (RN09)', () => {
      const slots = calcularDisponibilidad({
        horarios: horarioLunes09a10,
        ocupados: new Set([`${LUNES} 09:00`]),
        feriados: new Set(),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 15,
        bloqueMin: 15,
      });
      expect(slots).toEqual([
        { fecha: LUNES, hora: '09:15' },
        { fecha: LUNES, hora: '09:30' },
        { fecha: LUNES, hora: '09:45' },
      ]);
    });

    it('agrupa bloques por la duración del servicio y descarta los que no entran enteros (AGE-008)', () => {
      const slots = calcularDisponibilidad({
        horarios: horarioLunes09a10,
        ocupados: new Set(),
        feriados: new Set(),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 30,
        bloqueMin: 15,
      });
      // 09:45 + 30min = 10:15 excede el fin de franja (10:00) -> se descarta.
      expect(slots).toEqual([
        { fecha: LUNES, hora: '09:00' },
        { fecha: LUNES, hora: '09:15' },
        { fecha: LUNES, hora: '09:30' },
      ]);
    });

    it('un turno de 30min ocupado bloquea también el slot de 15min que lo precede (RN09)', () => {
      // Turno ASISTIDO/CONFIRMADO a las 09:15 (duración real desconocida por Agenda,
      // pero el propio slot ocupado siempre se descuenta).
      const slots = calcularDisponibilidad({
        horarios: horarioLunes09a10,
        ocupados: new Set([`${LUNES} 09:15`]),
        feriados: new Set(),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 30,
        bloqueMin: 15,
      });
      // 09:00 (cubre 09:00,09:15) y 09:15 (cubre 09:15,09:30) chocan con el ocupado -> se descartan.
      // 09:30 (cubre 09:30,09:45) queda libre.
      expect(slots).toEqual([{ fecha: LUNES, hora: '09:30' }]);
    });

    it('sin franjas para el profesional devuelve disponibilidad vacía (RN19)', () => {
      const slots = calcularDisponibilidad({
        horarios: [],
        ocupados: new Set(),
        feriados: new Set(),
        desde: LUNES,
        hasta: LUNES,
        duracionMin: 15,
        bloqueMin: 15,
      });
      expect(slots).toEqual([]);
    });
  });
});
