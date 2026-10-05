import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Rol,
  type HistoriaClinica,
  type HistoriaClinicaInexistente,
  type PacienteResumen,
} from '@syssalud/shared-types';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth-context';
import { ApiError, api } from '../lib/api';

type TipoBusqueda = 'dni' | 'nombre' | 'id';

const MSJ_SIN_HC =
  'El paciente seleccionado no cuenta con una historia clínica previa, ¿desea inicializarla?';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPOS_ENTRADA = [
  { campo: 'observaciones', etiqueta: 'Observaciones' },
  { campo: 'antecedentes', etiqueta: 'Antecedentes' },
  { campo: 'tratamientos', etiqueta: 'Tratamientos' },
] as const;

const FORM_VACIO = { observaciones: '', antecedentes: '', tratamientos: '', turnoId: '' };

const inputClass =
  'min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700';

function esHistoriaInexistente(
  resultado: HistoriaClinica | HistoriaClinicaInexistente,
): resultado is HistoriaClinicaInexistente {
  return 'existe' in resultado;
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

/** CUU09 — Gestionar historia clínica. Sólo para el rol PROFESIONAL (RN10, HCL-025). */
export function HistoriaClinicaPage() {
  const { usuario, token, logout } = useAuth();
  const [tipoBusqueda, setTipoBusqueda] = useState<TipoBusqueda>('dni');
  const [criterio, setCriterio] = useState('');
  const [apellido, setApellido] = useState('');
  // El paciente seleccionado es independiente de lo que se escribe en el buscador.
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [historia, setHistoria] = useState<HistoriaClinica | null>(null);
  const [coincidencias, setCoincidencias] = useState<PacienteResumen[]>([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (!usuario || !token) return <Navigate to="/login" replace />;
  if (usuario.rol !== Rol.PROFESIONAL) return <Navigate to="/dashboard" replace />;

  const ejecutar = async (accion: () => Promise<void>) => {
    setError('');
    setMensaje('');
    setCargando(true);
    try {
      await accion();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la operación');
    } finally {
      setCargando(false);
    }
  };

  const mostrarResultado = (resultado: HistoriaClinica | HistoriaClinicaInexistente) => {
    setPacienteId(resultado.pacienteId);
    if (esHistoriaInexistente(resultado)) {
      setHistoria(null);
      setMensaje(MSJ_SIN_HC);
      return;
    }
    setHistoria(resultado);
  };

  const buscar = (event: FormEvent) => {
    event.preventDefault();
    setPacienteId(null);
    setHistoria(null);
    setCoincidencias([]);
    void ejecutar(async () => {
      if (tipoBusqueda === 'id') {
        if (!UUID.test(criterio.trim())) {
          setError('El ID de paciente no es válido.');
          return;
        }
        mostrarResultado(await api.historiaClinica.obtener(criterio.trim(), token));
        return;
      }
      const resultado = await api.historiaClinica.buscar(
        tipoBusqueda === 'dni' ? { dni: criterio } : { nombre: criterio, apellido },
        token,
      );
      if (Array.isArray(resultado)) {
        setCoincidencias(resultado);
        setMensaje('Se encontraron varios pacientes. Elegí uno para continuar.');
        return;
      }
      mostrarResultado(resultado);
    });
  };

  const seleccionarPaciente = (paciente: PacienteResumen) => {
    setCoincidencias([]);
    void ejecutar(async () => {
      mostrarResultado(await api.historiaClinica.obtener(paciente.id, token));
    });
  };

  const inicializar = () => {
    if (!pacienteId) return;
    void ejecutar(async () => {
      setHistoria(await api.historiaClinica.inicializar(pacienteId, token));
      setMensaje('Historia clínica inicializada correctamente.');
    });
  };

  const agregarEntrada = (event: FormEvent) => {
    event.preventDefault();
    if (!historia) return;
    void ejecutar(async () => {
      const { mensaje: exito } = await api.historiaClinica.agregarEntrada(
        historia.pacienteId,
        { ...form, turnoId: form.turnoId.trim() || undefined },
        token,
      );
      const actualizada = await api.historiaClinica.obtener(historia.pacienteId, token);
      if (!esHistoriaInexistente(actualizada)) setHistoria(actualizada);
      setForm(FORM_VACIO);
      setMensaje(exito);
    });
  };

  const placeholder =
    tipoBusqueda === 'dni' ? 'DNI' : tipoBusqueda === 'nombre' ? 'Nombre' : 'ID de paciente';

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand subtitle="Historia clínica" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-mono text-xs uppercase text-teal-600 dark:text-teal-400">CUU09 · RN10</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">
          Gestionar historia clínica
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Buscá un paciente por DNI o por nombre y apellido.
        </p>

        <form
          onSubmit={buscar}
          className="mt-8 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <select
            value={tipoBusqueda}
            onChange={(event) => setTipoBusqueda(event.target.value as TipoBusqueda)}
            className="rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
          >
            <option value="dni">DNI</option>
            <option value="nombre">Nombre y apellido</option>
            <option value="id">ID de paciente</option>
          </select>
          <input
            value={criterio}
            onChange={(event) => setCriterio(event.target.value)}
            placeholder={placeholder}
            required
            className={inputClass}
          />
          {tipoBusqueda === 'nombre' && (
            <input
              value={apellido}
              onChange={(event) => setApellido(event.target.value)}
              placeholder="Apellido"
              required
              className={inputClass}
            />
          )}
          <button
            type="submit"
            disabled={cargando}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Buscar
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}
        {mensaje && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">
            <p>{mensaje}</p>
            {pacienteId && !historia && (
              <button
                type="button"
                onClick={inicializar}
                disabled={cargando}
                className="shrink-0 rounded-md bg-teal-600 px-3 py-1.5 font-medium text-white disabled:opacity-40"
              >
                Inicializar
              </button>
            )}
          </div>
        )}

        {coincidencias.length > 0 && (
          <section className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-medium dark:text-slate-50">Seleccioná un paciente</h2>
            <div className="mt-3 space-y-2">
              {coincidencias.map((paciente) => (
                <button
                  key={paciente.id}
                  type="button"
                  onClick={() => seleccionarPaciente(paciente)}
                  className="block w-full rounded-md border border-slate-200 px-3 py-2 text-left text-sm hover:border-teal-500 dark:border-slate-700 dark:text-slate-300"
                >
                  {paciente.nombreCompleto} · DNI {paciente.dni}
                </button>
              ))}
            </div>
          </section>
        )}

        {historia && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xl font-semibold dark:text-slate-50">
                {historia.nomAppPac ?? 'Paciente (datos personales no disponibles)'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[historia.telefono, historia.correo].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-1 text-sm text-slate-500">{historia.entradas.length} entradas</p>
              <div className="mt-6 space-y-4">
                {historia.entradas.map((entrada) => (
                  <article key={entrada.id} className="border-l-2 border-teal-500 pl-4 text-sm">
                    <p className="font-mono text-xs text-teal-700 dark:text-teal-300">
                      {entrada.fecha} · actualizada {formatearFechaHora(entrada.fechaActualizacion)}
                    </p>
                    {CAMPOS_ENTRADA.map(({ campo, etiqueta }) =>
                      entrada[campo] ? (
                        <p key={campo} className="mt-1 dark:text-slate-300">
                          <span className="font-medium">{etiqueta}:</span> {entrada[campo]}
                        </p>
                      ) : null,
                    )}
                  </article>
                ))}
              </div>
            </section>

            <form
              onSubmit={agregarEntrada}
              className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold dark:text-slate-50">Registrar nueva información</h2>
              {CAMPOS_ENTRADA.map(({ campo, etiqueta }) => (
                <label key={campo} className="mt-4 block text-sm dark:text-slate-300">
                  {etiqueta}
                  <textarea
                    value={form[campo]}
                    onChange={(event) => setForm({ ...form, [campo]: event.target.value })}
                    rows={3}
                    maxLength={5000}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                  />
                </label>
              ))}
              <label className="mt-4 block text-sm dark:text-slate-300">
                Turno asociado (opcional)
                <input
                  value={form.turnoId}
                  onChange={(event) => setForm({ ...form, turnoId: event.target.value })}
                  placeholder="Si se deja vacío, se usa el último turno asistido"
                  className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                />
              </label>
              <button
                type="submit"
                disabled={cargando}
                className="mt-5 w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Registrar información
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
