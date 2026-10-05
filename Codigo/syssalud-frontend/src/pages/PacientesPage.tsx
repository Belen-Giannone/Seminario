import { useEffect, useState, type FormEvent } from 'react';
import {
  EstadoPaciente,
  Rol,
  type CrearPacienteRequest,
  type Paciente,
  type PacienteResumen,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { FormField, claseCampo } from '../components/FormField';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const FORM_VACIO: CrearPacienteRequest = {
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: '',
  telefono: '',
  email: '',
  domicilio: '',
};

const ESTADO: Record<EstadoPaciente, { etiqueta: string; clase: string }> = {
  [EstadoPaciente.ACTIVO]: {
    etiqueta: 'Activo',
    clase: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  },
  [EstadoPaciente.PENDIENTE_CREDENCIALES]: {
    etiqueta: 'Sin credenciales',
    clase: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  [EstadoPaciente.INACTIVO]: {
    etiqueta: 'Inactivo',
    clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

function mensajeDe(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`, sin pasar por `Date` (evita el corrimiento por zona horaria). */
function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha;
}

/** CUU01 — búsqueda, ficha y alta de pacientes por el asistente. */
export function PacientesPage() {
  return (
    <AppShell roles={[Rol.ASISTENTE]}>
      <Pacientes />
    </AppShell>
  );
}

function Pacientes() {
  const { token } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [pacientes, setPacientes] = useState<PacienteResumen[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [recarga, setRecarga] = useState(0);

  const [panel, setPanel] = useState<'vacio' | 'detalle' | 'alta'>('vacio');
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState('');
  const [exito, setExito] = useState('');

  // Búsqueda en vivo con debounce; se descarta la respuesta si llegó otra búsqueda después.
  useEffect(() => {
    if (!token) return;
    let vigente = true;
    setCargandoLista(true);
    const timer = setTimeout(() => {
      api.pacientes
        .buscar(busqueda, token)
        .then((lista) => {
          if (!vigente) return;
          setPacientes(lista);
          setErrorLista('');
        })
        .catch((err: unknown) => {
          if (vigente) setErrorLista(mensajeDe(err, 'No se pudo cargar el listado de pacientes.'));
        })
        .finally(() => {
          if (vigente) setCargandoLista(false);
        });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, token, recarga]);

  if (!token) return null;

  const verPaciente = async (id: string) => {
    setPanel('detalle');
    setExito('');
    setErrorDetalle('');
    setCargandoDetalle(true);
    try {
      setSeleccionado(await api.pacientes.obtener(id, token));
    } catch (err) {
      setSeleccionado(null);
      setErrorDetalle(mensajeDe(err, 'No se pudo cargar la ficha del paciente.'));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const alRegistrar = (paciente: Paciente) => {
    setSeleccionado(paciente);
    setPanel('detalle');
    setExito(`Paciente registrado correctamente con el Nº ${paciente.numeroPaciente}.`);
    setRecarga((n) => n + 1);
  };

  return (
    <>
      <PageHeader
        eyebrow="CUU01 · Pacientes"
        titulo="Pacientes"
        descripcion="Buscá, consultá y registrá a los pacientes del centro."
        acciones={
          <Button
            onClick={() => {
              setExito('');
              setPanel('alta');
            }}
          >
            + Nuevo paciente
          </Button>
        }
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <label htmlFor="busqueda" className="sr-only">
              Buscar paciente
            </label>
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="busqueda"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por DNI o apellido"
                className={`${claseCampo()} pl-9`}
              />
            </div>
          </div>

          {errorLista ? (
            <div className="p-4">
              <Alert tono="error">{errorLista}</Alert>
            </div>
          ) : (
            <TablaPacientes
              pacientes={pacientes}
              cargando={cargandoLista}
              hayBusqueda={!!busqueda.trim()}
              seleccionadoId={panel === 'detalle' ? seleccionado?.id : undefined}
              onSeleccionar={(id) => void verPaciente(id)}
            />
          )}
        </Card>

        <aside className="lg:sticky lg:top-24">
          {panel === 'alta' && (
            <FormularioAlta token={token} onCancelar={() => setPanel('vacio')} onRegistrado={alRegistrar} />
          )}
          {panel === 'detalle' && (
            <Card className="p-5">
              {exito && (
                <Alert tono="exito" className="mb-4">
                  {exito}
                </Alert>
              )}
              {cargandoDetalle && <p className="text-sm text-slate-500">Cargando ficha…</p>}
              {errorDetalle && <Alert tono="error">{errorDetalle}</Alert>}
              {!cargandoDetalle && seleccionado && <FichaPaciente paciente={seleccionado} />}
            </Card>
          )}
          {panel === 'vacio' && (
            <Card className="border-dashed p-6 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Ningún paciente seleccionado</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Elegí un paciente del listado para ver su ficha, o registrá uno nuevo.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

interface TablaPacientesProps {
  pacientes: PacienteResumen[];
  cargando: boolean;
  hayBusqueda: boolean;
  seleccionadoId?: string;
  onSeleccionar: (id: string) => void;
}

function TablaPacientes({ pacientes, cargando, hayBusqueda, seleccionadoId, onSeleccionar }: TablaPacientesProps) {
  if (cargando && pacientes.length === 0) {
    return (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label="Cargando pacientes">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3.5">
            <span className="h-3 w-10 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <span className="h-3 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <span className="ml-auto h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </li>
        ))}
      </ul>
    );
  }

  if (pacientes.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {hayBusqueda ? 'No se encontraron pacientes con ese criterio.' : 'Todavía no hay pacientes registrados.'}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {hayBusqueda ? 'Probá con otro DNI o apellido.' : 'Usá "Nuevo paciente" para dar de alta el primero.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto transition-opacity ${cargando ? 'opacity-60' : ''}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Nº
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Paciente
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              DNI
            </th>
            <th scope="col" className="px-4 py-2.5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {pacientes.map((paciente) => {
            const activo = paciente.id === seleccionadoId;
            return (
              <tr
                key={paciente.id}
                onClick={() => onSeleccionar(paciente.id)}
                className={`cursor-pointer transition-theme ${
                  activo ? 'bg-teal-50/60 dark:bg-teal-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {String(paciente.numeroPaciente).padStart(4, '0')}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{paciente.nombreCompleto}</td>
                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{paciente.dni}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeleccionar(paciente.id);
                    }}
                    className="whitespace-nowrap rounded text-sm font-medium text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400"
                  >
                    Ver ficha
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FichaPaciente({ paciente }: { paciente: Paciente }) {
  const estado = ESTADO[paciente.estado];
  const datos: [string, string][] = [
    ['DNI', paciente.dni],
    ['Fecha de nacimiento', paciente.fechaNacimiento ? formatearFecha(paciente.fechaNacimiento) : '—'],
    ['Teléfono', paciente.telefono || '—'],
    ['Email', paciente.email || '—'],
    ['Domicilio', paciente.domicilio || '—'],
    ['Alta', paciente.fechaAlta ? formatearFecha(paciente.fechaAlta) : '—'],
  ];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            Paciente Nº {String(paciente.numeroPaciente).padStart(4, '0')}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {paciente.nombre} {paciente.apellido}
          </h2>
        </div>
        {estado && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${estado.clase}`}>
            {estado.etiqueta}
          </span>
        )}
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
            <dt className="text-slate-500 dark:text-slate-400">{etiqueta}</dt>
            <dd className="break-words text-slate-900 dark:text-slate-100">{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface FormularioAltaProps {
  token: string;
  onCancelar: () => void;
  onRegistrado: (paciente: Paciente) => void;
}

function FormularioAlta({ token, onCancelar, onRegistrado }: FormularioAltaProps) {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const campo = (nombre: keyof CrearPacienteRequest) => ({
    id: `alta-${nombre}`,
    value: form[nombre],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [nombre]: e.target.value })),
    required: true,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      onRegistrado(await api.pacientes.registrar(form, token));
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo registrar el paciente.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Nuevo paciente</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Se le genera un usuario para que pueda ingresar al sistema.
      </p>
      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nombre" autoComplete="off" {...campo('nombre')} />
          <FormField label="Apellido" autoComplete="off" {...campo('apellido')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="DNI" inputMode="numeric" pattern="\d{7,8}" placeholder="30111222" {...campo('dni')} />
          <FormField label="Nacimiento" type="date" {...campo('fechaNacimiento')} />
        </div>
        <FormField label="Teléfono" type="tel" placeholder="341 555-1234" {...campo('telefono')} />
        <FormField label="Email" type="email" placeholder="nombre@correo.com" {...campo('email')} />
        <FormField label="Domicilio" {...campo('domicilio')} />

        {error && <Alert tono="error">{error}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" disabled={enviando} className="flex-1">
            {enviando ? 'Registrando…' : 'Registrar paciente'}
          </Button>
          <Button variante="secundario" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
