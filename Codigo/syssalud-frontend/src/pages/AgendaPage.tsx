import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoTurno, Rol, type AgendaItem, type AgendaProfesional } from '@syssalud/shared-types';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

type Periodo = 'dia' | 'semana' | 'mes';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function aISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Rango [desde, hasta] para el período elegido, a partir de una fecha de referencia (RN07: agenda hábil L-V). */
function calcularRango(fechaRef: string, periodo: Periodo): { desde: string; hasta: string } {
  const [y, m, d] = fechaRef.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));

  if (periodo === 'dia') {
    return { desde: fechaRef, hasta: fechaRef };
  }

  if (periodo === 'semana') {
    const dow = base.getUTCDay(); // 0=domingo..6=sábado
    const diffALunes = dow === 0 ? -6 : 1 - dow;
    const lunes = new Date(base.getTime() + diffALunes * 86_400_000);
    const viernes = new Date(lunes.getTime() + 4 * 86_400_000);
    return { desde: aISO(lunes), hasta: aISO(viernes) };
  }

  const primero = new Date(Date.UTC(y, m - 1, 1));
  const ultimo = new Date(Date.UTC(y, m, 0));
  return { desde: aISO(primero), hasta: aISO(ultimo) };
}

const ESTILO_ESTADO: Record<string, string> = {
  [EstadoTurno.RESERVADO]: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  [EstadoTurno.CONFIRMADO]: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  [EstadoTurno.REPROGRAMADO]: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  [EstadoTurno.CANCELADO]: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  [EstadoTurno.CANCELADO_SIN_DEVOLUCION]: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  [EstadoTurno.FINALIZADO]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function EstadoBadge({ estado }: { estado: string }) {
  const estilo = ESTILO_ESTADO[estado] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${estilo}`}>
      {estado}
    </span>
  );
}

function FilaTurno({ item }: { item: AgendaItem }) {
  return (
    <tr className="text-sm">
      <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{item.fecha}</td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{item.hora}</td>
      <td className="px-4 py-3 text-slate-900 dark:text-slate-50">{item.pacienteNombre ?? '—'}</td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.servicioNombre ?? '—'}</td>
      <td className="px-4 py-3">
        <EstadoBadge estado={item.estado} />
      </td>
    </tr>
  );
}

/** Panel de Control / Gestionar Agenda (CUU05, AGE-026). */
export function AgendaPage() {
  const { usuario, token } = useAuth();
  const esProfesional = usuario?.rol === Rol.PROFESIONAL;

  const [fechaRef, setFechaRef] = useState(hoyISO());
  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [profesionalIdInput, setProfesionalIdInput] = useState('');
  const [resultado, setResultado] = useState<AgendaProfesional | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profesionalIdValido = esProfesional || UUID_RE.test(profesionalIdInput.trim());

  useEffect(() => {
    if (!token || !usuario) return;
    if (!profesionalIdValido) {
      setResultado(null);
      setError(null);
      return;
    }

    const { desde, hasta } = calcularRango(fechaRef, periodo);
    let cancelado = false;

    setCargando(true);
    setError(null);

    const promesa = esProfesional
      ? api.agenda.miAgenda({ desde, hasta, periodo }, token)
      : api.agenda.deProfesional(profesionalIdInput.trim(), { desde, hasta, periodo }, token);

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
  }, [token, usuario, esProfesional, profesionalIdInput, fechaRef, periodo, profesionalIdValido]);

  if (!usuario) return null;

  const items = resultado?.items ?? [];
  const pendientes = items.filter((i) => i.estado === EstadoTurno.RESERVADO);

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur transition-theme dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Brand />
            <Link
              to="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Volver
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Gestionar agenda</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          CUU05 — Consultar agenda de turnos asignados, con fecha, hora, paciente y servicio.
        </p>

        <section className="mt-6 flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 transition-theme sm:flex-row sm:flex-wrap sm:items-end dark:border-slate-800 dark:bg-slate-900">
          {!esProfesional && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profesionalId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Profesional (id)
              </label>
              <input
                id="profesionalId"
                className="w-72 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm outline-none transition-theme placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
                placeholder="uuid del profesional"
                value={profesionalIdInput}
                onChange={(e) => setProfesionalIdInput(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fechaRef" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fecha de referencia
            </label>
            <input
              id="fechaRef"
              type="date"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-theme focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              value={fechaRef}
              onChange={(e) => setFechaRef(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Período</span>
            <div className="inline-flex rounded-md border border-slate-300 p-0.5 dark:border-slate-700">
              {(['dia', 'semana', 'mes'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-theme ${
                    periodo === p
                      ? 'bg-teal-600 text-white dark:bg-teal-500'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>

          {resultado && (
            <span className="ml-auto font-mono text-xs text-slate-400 dark:text-slate-500">
              {resultado.periodo.desde} → {resultado.periodo.hasta}
            </span>
          )}
        </section>

        {!esProfesional && !profesionalIdValido && profesionalIdInput.trim() !== '' && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Ingresá un id de profesional válido (uuid).
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        {resultado?.ocupacionParcial && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            El módulo Turnos no está disponible: esta información puede estar incompleta.
          </p>
        )}

        <section className="mt-6 rounded-lg border border-slate-200 bg-white transition-theme dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="font-medium text-slate-900 dark:text-slate-50">Turnos del período</h2>
            {cargando && <span className="text-xs text-slate-400 dark:text-slate-500">Cargando…</span>}
          </div>

          {items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {resultado?.mensaje ?? (profesionalIdValido ? 'Sin resultados.' : 'Ingresá un profesional para consultar su agenda.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Hora</th>
                    <th className="px-4 py-2.5 font-medium">Paciente</th>
                    <th className="px-4 py-2.5 font-medium">Servicio</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <FilaTurno key={item.idTurno} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white transition-theme dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="font-medium text-slate-900 dark:text-slate-50">Turnos pendientes</h2>
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{pendientes.length}</span>
          </div>
          {pendientes.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No hay turnos pendientes en el período.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendientes.map((item) => (
                <li key={item.idTurno} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.fecha} · <span className="font-mono">{item.hora}</span> · {item.pacienteNombre ?? '—'}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{item.servicioNombre ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
