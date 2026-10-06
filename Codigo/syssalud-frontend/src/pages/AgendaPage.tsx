import { useEffect, useState } from 'react';
import {
  EstadoTurno,
  Rol,
  type AgendaItem,
  type AgendaProfesional,
  type ProfesionalResumen,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { SelectField } from '../components/FormField';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

type Periodo = 'dia' | 'semana' | 'mes';

const DIA_MS = 86_400_000;

/** Fecha local `YYYY-MM-DD` (no UTC: a la noche `toISOString` ya da el día siguiente). */
function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function aISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function desdeISO(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Rango [desde, hasta] del período que contiene `fechaRef` (la semana es hábil, L-V, RN07). */
function calcularRango(fechaRef: string, periodo: Periodo): { desde: string; hasta: string } {
  const base = desdeISO(fechaRef);
  if (periodo === 'dia') return { desde: fechaRef, hasta: fechaRef };
  if (periodo === 'semana') {
    const dow = base.getUTCDay(); // 0=domingo..6=sábado
    const lunes = new Date(base.getTime() + (dow === 0 ? -6 : 1 - dow) * DIA_MS);
    return { desde: aISO(lunes), hasta: aISO(new Date(lunes.getTime() + 4 * DIA_MS)) };
  }
  const primero = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
  return { desde: aISO(primero), hasta: aISO(ultimo) };
}

/** Mueve la fecha de referencia un período hacia adelante o atrás. */
function desplazar(fechaRef: string, periodo: Periodo, sentido: 1 | -1): string {
  const base = desdeISO(fechaRef);
  if (periodo === 'mes') {
    return aISO(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + sentido, 1)));
  }
  return aISO(new Date(base.getTime() + sentido * (periodo === 'dia' ? 1 : 7) * DIA_MS));
}

const fmtDiaLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtCorto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function tituloRango(desde: string, hasta: string, periodo: Periodo): string {
  if (periodo === 'dia') return fmtDiaLargo.format(desdeISO(desde));
  if (periodo === 'mes') return fmtMes.format(desdeISO(desde));
  return `${fmtCorto.format(desdeISO(desde))} – ${fmtCorto.format(desdeISO(hasta))}`;
}

const ESTADO: Record<string, { etiqueta: string; clase: string }> = {
  [EstadoTurno.SOLICITADO]: {
    etiqueta: 'Pendiente de pago',
    clase: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  [EstadoTurno.CONFIRMADO]: {
    etiqueta: 'Confirmado',
    clase: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  },
  [EstadoTurno.REPROGRAMADO]: {
    etiqueta: 'Reprogramado',
    clase: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  },
  [EstadoTurno.ASISTIDO]: {
    etiqueta: 'Asistido',
    clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

function EstadoBadge({ estado }: { estado: string }) {
  const info = ESTADO[estado] ?? {
    etiqueta: estado,
    clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.clase}`}>
      {info.etiqueta}
    </span>
  );
}

/** Panel de Control / Gestionar Agenda (CUU05, AGE-026). */
export function AgendaPage() {
  return (
    <AppShell roles={[Rol.PROFESIONAL, Rol.ASISTENTE]}>
      <Agenda />
    </AppShell>
  );
}

function Agenda() {
  const { usuario, token } = useAuth();
  const esProfesional = usuario?.rol === Rol.PROFESIONAL;

  const [fechaRef, setFechaRef] = useState(hoyISO());
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [profesionales, setProfesionales] = useState<ProfesionalResumen[]>([]);
  const [profesionalId, setProfesionalId] = useState('');
  const [resultado, setResultado] = useState<AgendaProfesional | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El asistente elige de la lista de profesionales activos (Profesionales, PRO-013).
  useEffect(() => {
    if (!token || esProfesional) return;
    api.profesionales
      .listar({ activos: true }, token)
      .then((lista) => {
        setProfesionales(lista);
        setProfesionalId((actual) => actual || lista[0]?.id || '');
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la lista de profesionales'),
      );
  }, [token, esProfesional]);

  const { desde, hasta } = calcularRango(fechaRef, periodo);

  useEffect(() => {
    if (!token) return;
    if (!esProfesional && !profesionalId) return;

    let cancelado = false;
    setCargando(true);
    setError(null);

    const promesa = esProfesional
      ? api.agenda.miAgenda({ desde, hasta, periodo }, token)
      : api.agenda.deProfesional(profesionalId, { desde, hasta, periodo }, token);

    promesa
      .then((data) => {
        if (!cancelado) setResultado(data);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setResultado(null);
        setError(err instanceof ApiError ? err.message : 'No se pudo consultar la agenda');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [token, esProfesional, profesionalId, desde, hasta, periodo]);

  const items = resultado?.items ?? [];
  const pendientes = items.filter((i) => i.estado === EstadoTurno.SOLICITADO);
  const porDia = items.reduce<Map<string, AgendaItem[]>>((mapa, item) => {
    mapa.set(item.fecha, [...(mapa.get(item.fecha) ?? []), item]);
    return mapa;
  }, new Map());

  return (
    <>
      <PageHeader
        eyebrow="CUU05 · Agenda"
        titulo={esProfesional ? 'Mi agenda' : 'Agenda de profesionales'}
        descripcion="Turnos asignados con fecha, hora, paciente y servicio. Sólo días hábiles, sin feriados."
      />

      <Card className="mt-8 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            {!esProfesional && (
              <div className="w-64">
                <SelectField
                  id="profesional"
                  label="Profesional"
                  value={profesionalId}
                  onChange={(e) => setProfesionalId(e.target.value)}
                  disabled={profesionales.length === 0}
                >
                  {profesionales.length === 0 && <option value="">Sin profesionales activos</option>}
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombreCompleto} · {p.especialidad}
                    </option>
                  ))}
                </SelectField>
              </div>
            )}
            <div role="group" aria-label="Período" className="inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
              {(['dia', 'semana', 'mes'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={periodo === p}
                  onClick={() => setPeriodo(p)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                    periodo === p
                      ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variante="secundario" tamano="sm" aria-label="Período anterior" onClick={() => setFechaRef(desplazar(fechaRef, periodo, -1))}>
              ←
            </Button>
            <Button variante="secundario" tamano="sm" onClick={() => setFechaRef(hoyISO())}>
              Hoy
            </Button>
            <Button variante="secundario" tamano="sm" aria-label="Período siguiente" onClick={() => setFechaRef(desplazar(fechaRef, periodo, 1))}>
              →
            </Button>
            <p className="ml-2 min-w-40 text-sm font-medium capitalize text-slate-900 dark:text-slate-50">
              {tituloRango(desde, hasta, periodo)}
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3">
        {error && <Alert tono="error">{error}</Alert>}
        {resultado?.ocupacionParcial && (
          <Alert tono="info">El módulo Turnos no respondió: la agenda puede estar incompleta.</Alert>
        )}
      </div>

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className={`overflow-hidden transition-opacity ${cargando ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="font-medium text-slate-900 dark:text-slate-50">
              {resultado?.profesionalNombre ? `Turnos de ${resultado.profesionalNombre}` : 'Turnos del período'}
            </h2>
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
              {cargando ? 'Cargando…' : `${items.length} turnos`}
            </span>
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {cargando ? 'Cargando agenda…' : (resultado?.mensaje ?? 'No existen turnos en la agenda.')}
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {[...porDia.entries()].map(([fecha, turnos]) => (
                <section key={fecha}>
                  <h3 className="bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
                    {fmtDiaLargo.format(desdeISO(fecha))}
                  </h3>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {turnos.map((item) => (
                      <li key={item.idTurno} className="flex items-center gap-4 px-5 py-3 text-sm">
                        <span className="w-12 shrink-0 font-mono font-medium text-slate-900 dark:text-slate-50">{item.hora}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {item.pacienteNombre ?? 'Paciente sin datos'}
                          </p>
                          <p className="truncate text-slate-500 dark:text-slate-400">
                            {item.servicioNombre ?? 'Servicio sin datos'}
                          </p>
                        </div>
                        <EstadoBadge estado={item.estado} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="font-medium text-slate-900 dark:text-slate-50">Turnos pendientes</h2>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-mono text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {pendientes.length}
            </span>
          </div>
          {pendientes.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay turnos pendientes de pago en el período.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendientes.map((item) => (
                <li key={item.idTurno} className="px-5 py-3 text-sm">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{item.pacienteNombre ?? 'Paciente sin datos'}</p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {fmtCorto.format(desdeISO(item.fecha))} · <span className="font-mono">{item.hora}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
