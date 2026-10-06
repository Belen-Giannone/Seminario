import { FormEvent, useState } from 'react';
import {
  Rol,
  type HistoriaClinica,
  type HistoriaClinicaInexistente,
  type PacienteResumen,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { FormField, SelectField, TextAreaField } from '../components/FormField';
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

function esHistoriaInexistente(
  resultado: HistoriaClinica | HistoriaClinicaInexistente,
): resultado is HistoriaClinicaInexistente {
  return 'existe' in resultado;
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`, sin pasar por `Date` (evita el corrimiento por zona horaria). */
function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha;
}

/** CUU09 — Gestionar historia clínica. Sólo para el rol PROFESIONAL (RN10, HCL-025). */
export function HistoriaClinicaPage() {
  return (
    <AppShell roles={[Rol.PROFESIONAL]}>
      <GestionHistoriaClinica />
    </AppShell>
  );
}

function GestionHistoriaClinica() {
  const { token } = useAuth();
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

  if (!token) return null;

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

  const etiquetaCriterio = tipoBusqueda === 'dni' ? 'DNI' : tipoBusqueda === 'nombre' ? 'Nombre' : 'ID de paciente';

  return (
    <>
      <PageHeader
        eyebrow="CUU09 · RN10"
        titulo="Historia clínica"
        descripcion="Buscá un paciente por DNI o por nombre y apellido para ver y actualizar su historia clínica."
      />

      <Card className="mt-8 p-5">
        <form onSubmit={buscar} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <SelectField
            id="tipo-busqueda"
            label="Buscar por"
            value={tipoBusqueda}
            onChange={(event) => setTipoBusqueda(event.target.value as TipoBusqueda)}
          >
            <option value="dni">DNI</option>
            <option value="nombre">Nombre y apellido</option>
            <option value="id">ID de paciente</option>
          </SelectField>
          <div className={tipoBusqueda === 'nombre' ? '' : 'sm:col-span-2'}>
            <FormField
              id="criterio"
              label={etiquetaCriterio}
              value={criterio}
              onChange={(event) => setCriterio(event.target.value)}
              inputMode={tipoBusqueda === 'dni' ? 'numeric' : undefined}
              placeholder={tipoBusqueda === 'dni' ? '30111222' : tipoBusqueda === 'nombre' ? 'Juana' : 'UUID del paciente'}
              required
            />
          </div>
          {tipoBusqueda === 'nombre' && (
            <FormField
              id="apellido"
              label="Apellido"
              value={apellido}
              onChange={(event) => setApellido(event.target.value)}
              placeholder="Pérez"
              required
            />
          )}
          <Button type="submit" disabled={cargando}>
            {cargando ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>
      </Card>

      <div className="mt-4 space-y-4">
        {error && <Alert tono="error">{error}</Alert>}
        {mensaje && (
          <Alert
            tono={pacienteId && !historia ? 'info' : 'exito'}
            accion={
              pacienteId && !historia ? (
                <Button tamano="sm" onClick={inicializar} disabled={cargando}>
                  Inicializar historia clínica
                </Button>
              ) : undefined
            }
          >
            {mensaje}
          </Alert>
        )}
      </div>

      {coincidencias.length > 0 && (
        <Card className="mt-4 overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">
              Se encontraron {coincidencias.length} pacientes. Elegí uno para continuar.
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {coincidencias.map((paciente) => (
              <li key={paciente.id}>
                <button
                  type="button"
                  onClick={() => seleccionarPaciente(paciente)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-theme hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-50">{paciente.nombreCompleto}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">DNI {paciente.dni}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {historia && (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="p-6">
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">Historia clínica</p>
            <h2 className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-50">
              {historia.nomAppPac ?? 'Paciente (datos personales no disponibles)'}
            </h2>
            {(historia.telefono || historia.correo) && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {[historia.telefono, historia.correo].filter(Boolean).join(' · ')}
              </p>
            )}

            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Consultas ({historia.entradas.length})
            </h3>
            {historia.entradas.length === 0 ? (
              <p className="mt-3 rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Todavía no hay consultas registradas.
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
                {historia.entradas.map((entrada) => (
                  <li key={entrada.id} className="relative border-l-2 border-teal-500 pl-4">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {formatearFecha(entrada.fecha)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Actualizada {formatearFechaHora(entrada.fechaActualizacion)}
                    </p>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {CAMPOS_ENTRADA.map(({ campo, etiqueta }) =>
                        entrada[campo] ? (
                          <div key={campo}>
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              {etiqueta}
                            </dt>
                            <dd className="whitespace-pre-line text-slate-700 dark:text-slate-300">{entrada[campo]}</dd>
                          </div>
                        ) : null,
                      )}
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Registrar nueva información</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Completá al menos uno de los campos.</p>
            <form onSubmit={agregarEntrada} className="mt-5 flex flex-col gap-4">
              {CAMPOS_ENTRADA.map(({ campo, etiqueta }) => (
                <TextAreaField
                  key={campo}
                  id={`entrada-${campo}`}
                  label={etiqueta}
                  value={form[campo]}
                  onChange={(event) => setForm({ ...form, [campo]: event.target.value })}
                  rows={3}
                  maxLength={5000}
                />
              ))}
              <FormField
                id="entrada-turno"
                label="Turno asociado (opcional)"
                value={form.turnoId}
                onChange={(event) => setForm({ ...form, turnoId: event.target.value })}
                placeholder="Vacío: último turno asistido"
              />
              <Button type="submit" disabled={cargando}>
                {cargando ? 'Guardando…' : 'Registrar información'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
