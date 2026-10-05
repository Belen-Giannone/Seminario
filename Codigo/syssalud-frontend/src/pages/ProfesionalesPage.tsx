import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DiaSemana, Rol, type Profesional } from '@syssalud/shared-types';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';

const ETIQUETA_DIA: Record<DiaSemana, string> = {
  [DiaSemana.LUNES]: 'Lunes',
  [DiaSemana.MARTES]: 'Martes',
  [DiaSemana.MIERCOLES]: 'Miércoles',
  [DiaSemana.JUEVES]: 'Jueves',
  [DiaSemana.VIERNES]: 'Viernes',
  [DiaSemana.SABADO]: 'Sábado',
  [DiaSemana.DOMINGO]: 'Domingo',
};

export function ProfesionalesPage() {
  const { usuario, token, logout } = useAuth();
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const puedeCrear = usuario?.rol === Rol.ASISTENTE || usuario?.rol === Rol.DUENO;

  async function cargarProfesionales() {
    if (!token) return;
    setCargando(true);
    try {
      const data = await api.listarProfesionales(token);
      setProfesionales(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarProfesionales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur transition-theme dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-theme hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-sm text-teal-600 hover:underline dark:text-teal-400">
              ← Volver al dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Profesionales
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Alta y horarios de atención.
            </p>
          </div>
        </div>

        {puedeCrear && (
          <FormularioAltaProfesional token={token!} onCreado={cargarProfesionales} />
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Listado
          </h2>

          {cargando && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando…</p>}
          {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

          {!cargando && !error && profesionales.length === 0 && (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay profesionales cargados.
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profesionales.map((prof) => (
              <ProfesionalCard
                key={prof.id}
                profesional={prof}
                puedeEditar={puedeCrear || usuario.rol === Rol.PROFESIONAL}
                token={token!}
                onActualizado={cargarProfesionales}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function FormularioAltaProfesional({
  token,
  onCreado,
}: {
  token: string;
  onCreado: () => void;
}) {
  const [usuarioId, setUsuarioId] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [matricula, setMatricula] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.crearProfesional(
        { usuarioId, especialidad, matricula: matricula || undefined },
        token,
      );
      setUsuarioId('');
      setEspecialidad('');
      setMatricula('');
      onCreado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el profesional');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 transition-theme dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Dar de alta un profesional
      </h2>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Nota: el usuario debe estar registrado antes (vía /auth/register con rol PROFESIONAL).
        Pegá acá su id. — Pendiente: pedirle a la pareja de Auth un endpoint de búsqueda por
        email para no tener que usar el UUID a mano.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            usuarioId
          </label>
          <input
            required
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            placeholder="UUID del usuario"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Especialidad
          </label>
          <input
            required
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            placeholder="Dermatología"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Matrícula (opcional)
          </label>
          <input
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            placeholder="MP12345"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-3">{error}</p>}

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-theme hover:bg-teal-700 disabled:opacity-50"
          >
            {enviando ? 'Creando…' : 'Crear profesional'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProfesionalCard({
  profesional,
  puedeEditar,
  token,
  onActualizado,
}: {
  profesional: Profesional;
  puedeEditar: boolean;
  token: string;
  onActualizado: () => void;
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(DiaSemana.LUNES);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('13:00');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgregarHorario(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api.agregarHorarioProfesional(profesional.id, { diaSemana, horaInicio, horaFin }, token);
      setMostrarForm(false);
      onActualizado();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo agregar el horario');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 transition-theme dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-slate-50">{profesional.especialidad}</h3>
        {profesional.matricula && (
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
            {profesional.matricula}
          </span>
        )}
      </div>

      <ul className="mt-3 space-y-1">
        {(profesional.horarios ?? []).map((h) => (
          <li key={h.id} className="text-sm text-slate-500 dark:text-slate-400">
            {ETIQUETA_DIA[h.diaSemana]}: {h.horaInicio.slice(0, 5)} – {h.horaFin.slice(0, 5)}
          </li>
        ))}
        {(profesional.horarios ?? []).length === 0 && (
          <li className="text-sm text-slate-400 dark:text-slate-600">Sin horarios cargados.</li>
        )}
      </ul>

      {puedeEditar && (
        <div className="mt-4">
          {!mostrarForm ? (
            <button
              type="button"
              onClick={() => setMostrarForm(true)}
              className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              + Agregar horario
            </button>
          ) : (
            <form onSubmit={handleAgregarHorario} className="mt-2 space-y-2">
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(Number(e.target.value) as DiaSemana)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {Object.entries(ETIQUETA_DIA).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm transition-theme dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enviando}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-theme hover:bg-teal-700 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-theme dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
