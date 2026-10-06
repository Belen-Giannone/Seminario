import { useEffect, useState, type FormEvent } from 'react';
import {
  DiaSemana,
  Rol,
  type HorarioAtencionInput,
  type Profesional,
  type ProfesionalResumen,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { FormField, claseCampo } from '../components/FormField';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const ETIQUETA_DIA: Record<DiaSemana, string> = {
  [DiaSemana.LUNES]: 'Lunes',
  [DiaSemana.MARTES]: 'Martes',
  [DiaSemana.MIERCOLES]: 'Miércoles',
  [DiaSemana.JUEVES]: 'Jueves',
  [DiaSemana.VIERNES]: 'Viernes',
};

function mensajeDe(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Alta y horarios de atención de profesionales (PRO-027/028). */
export function ProfesionalesPage() {
  return (
    <AppShell roles={[Rol.ASISTENTE, Rol.DUENO, Rol.PROFESIONAL]}>
      <Profesionales />
    </AppShell>
  );
}

function Profesionales() {
  const { usuario, token } = useAuth();
  const [profesionales, setProfesionales] = useState<ProfesionalResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const esStaff = usuario?.rol === Rol.ASISTENTE || usuario?.rol === Rol.DUENO;

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    setCargando(true);
    api
      .profesionales.listar({}, token)
      .then((data) => {
        if (!vigente) return;
        setProfesionales(data);
        setError('');
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDe(err, 'No se pudo cargar la lista.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [token, recarga]);

  if (!usuario || !token) return null;

  return (
    <>
      <PageHeader
        titulo="Profesionales"
        descripcion="Alta y horarios de atención."
        acciones={
          esStaff && (
            <Button
              onClick={() => setMostrarAlta((v) => !v)}
              variante={mostrarAlta ? 'secundario' : 'primario'}
            >
              {mostrarAlta ? 'Cancelar' : '+ Nuevo profesional'}
            </Button>
          )
        }
      />

      {mostrarAlta && (
        <div className="mt-6">
          <FormularioAltaProfesional
            token={token}
            onCreado={() => {
              setRecarga((n) => n + 1);
            }}
          />
        </div>
      )}

      <section className="mt-8">
        {cargando && profesionales.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : error ? (
          <Alert tono="error">{error}</Alert>
        ) : profesionales.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Todavía no hay profesionales cargados.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {profesionales.map((prof) => (
              <ProfesionalCard
                key={prof.id}
                resumen={prof}
                expandido={expandidoId === prof.id}
                onToggle={() => setExpandidoId(expandidoId === prof.id ? null : prof.id)}
                puedeEditarDatos={esStaff}
                usuarioId={usuario.id}
                rol={usuario.rol}
                token={token}
                onActualizado={() => setRecarga((n) => n + 1)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function FormularioAltaProfesional({ token, onCreado }: { token: string; onCreado: () => void }) {
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', dni: '', especialidad: '', matricula: '' });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [credencial, setCredencial] = useState<{ email: string; passwordInicial: string } | null>(null);

  const campo = (nombre: keyof typeof form) => ({
    id: `alta-${nombre}`,
    value: form[nombre],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [nombre]: e.target.value })),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const { profesional, passwordInicial } = await api.profesionales.crear(
        { ...form, dni: form.dni || undefined },
        token,
      );
      setCredencial(passwordInicial ? { email: form.email, passwordInicial } : null);
      setForm({ nombre: '', apellido: '', email: '', dni: '', especialidad: '', matricula: '' });
      onCreado();
      if (!profesional.usuarioId) {
        setError('El profesional se creó, pero Auth no respondió: no se pudo generar su usuario de acceso todavía.');
      }
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo crear el profesional.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Dar de alta un profesional</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Crea el usuario de acceso y el registro del profesional en un solo paso.
      </p>

      {credencial && (
        <Alert tono="exito" className="mt-4">
          Profesional creado. Credencial inicial para <strong>{credencial.email}</strong>: código{' '}
          <code className="font-mono">{credencial.passwordInicial}</code> — comunicásela ahora, no se vuelve a
          mostrar.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Nombre" autoComplete="off" required {...campo('nombre')} />
        <FormField label="Apellido" autoComplete="off" required {...campo('apellido')} />
        <FormField label="Email" type="email" required {...campo('email')} />
        <FormField label="DNI (opcional)" {...campo('dni')} />
        <FormField label="Especialidad" required placeholder="Dermatología" {...campo('especialidad')} />
        <FormField label="Matrícula" required placeholder="MP12345" {...campo('matricula')} />

        {error && <Alert tono="error" className="sm:col-span-3">{error}</Alert>}

        <div className="sm:col-span-3">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear profesional'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface ProfesionalCardProps {
  resumen: ProfesionalResumen;
  expandido: boolean;
  onToggle: () => void;
  puedeEditarDatos: boolean;
  usuarioId: string;
  rol: Rol;
  token: string;
  onActualizado: () => void;
}

function ProfesionalCard({
  resumen,
  expandido,
  onToggle,
  puedeEditarDatos,
  usuarioId,
  rol,
  token,
  onActualizado,
}: ProfesionalCardProps) {
  const [detalle, setDetalle] = useState<Profesional | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!expandido) return;
    let vigente = true;
    setCargandoDetalle(true);
    api
      .profesionales.obtener(resumen.id, token)
      .then((data) => {
        if (vigente) setDetalle(data);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDe(err, 'No se pudo cargar el detalle.'));
      })
      .finally(() => {
        if (vigente) setCargandoDetalle(false);
      });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandido, resumen.id]);

  const puedeEditarHorarios = puedeEditarDatos || (rol === Rol.PROFESIONAL && detalle?.usuarioId === usuarioId);

  return (
    <Card className="p-5">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-slate-50">
            {resumen.nombreCompleto || '(sin usuario vinculado)'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{resumen.especialidad}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            resumen.activo
              ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {resumen.activo ? 'Activo' : 'Inactivo'}
        </span>
      </button>

      {expandido && (
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {cargandoDetalle && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>}
          {error && <Alert tono="error">{error}</Alert>}
          {detalle && (
            <DetalleProfesional
              detalle={detalle}
              puedeEditarDatos={puedeEditarDatos}
              puedeEditarHorarios={puedeEditarHorarios}
              token={token}
              onActualizado={() => {
                onActualizado();
                api.profesionales.obtener(resumen.id, token).then(setDetalle).catch(() => undefined);
              }}
            />
          )}
        </div>
      )}
    </Card>
  );
}

function DetalleProfesional({
  detalle,
  puedeEditarDatos,
  puedeEditarHorarios,
  token,
  onActualizado,
}: {
  detalle: Profesional;
  puedeEditarDatos: boolean;
  puedeEditarHorarios: boolean;
  token: string;
  onActualizado: () => void;
}) {
  const [guardandoBaja, setGuardandoBaja] = useState(false);

  async function toggleActivo() {
    setGuardandoBaja(true);
    try {
      await api.profesionales.actualizar(detalle.id, { activo: !detalle.activo }, token);
      onActualizado();
    } finally {
      setGuardandoBaja(false);
    }
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-400 dark:text-slate-500">Matrícula</dt>
          <dd className="font-mono text-slate-700 dark:text-slate-300">{detalle.matricula}</dd>
        </div>
        <div>
          <dt className="text-slate-400 dark:text-slate-500">Email</dt>
          <dd className="text-slate-700 dark:text-slate-300">{detalle.email || '—'}</dd>
        </div>
      </dl>

      {puedeEditarDatos && (
        <Button variante="secundario" tamano="sm" onClick={toggleActivo} disabled={guardandoBaja}>
          {detalle.activo ? 'Dar de baja' : 'Reactivar'}
        </Button>
      )}

      <EditorHorarios
        profesionalId={detalle.id}
        horariosActuales={detalle.horarios}
        puedeEditar={puedeEditarHorarios}
        token={token}
        onGuardado={onActualizado}
      />
    </div>
  );
}

function filaVacia(): HorarioAtencionInput {
  return { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '13:00' };
}

function EditorHorarios({
  profesionalId,
  horariosActuales,
  puedeEditar,
  token,
  onGuardado,
}: {
  profesionalId: string;
  horariosActuales: Profesional['horarios'];
  puedeEditar: boolean;
  token: string;
  onGuardado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [filas, setFilas] = useState<HorarioAtencionInput[]>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function empezarEdicion() {
    setFilas(
      horariosActuales.length
        ? horariosActuales.map((h) => ({
            diaSemana: h.diaSemana,
            horaInicio: h.horaInicio.slice(0, 5),
            horaFin: h.horaFin.slice(0, 5),
          }))
        : [filaVacia()],
    );
    setError('');
    setEditando(true);
  }

  function actualizarFila(i: number, cambios: Partial<HorarioAtencionInput>) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  async function guardar() {
    setGuardando(true);
    setError('');
    try {
      await api.profesionales.definirHorarios(profesionalId, { horarios: filas }, token);
      setEditando(false);
      onGuardado();
    } catch (err) {
      setError(mensajeDe(err, 'No se pudieron guardar los horarios.'));
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <div>
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Horarios de atención</h4>
        <ul className="mt-2 space-y-1">
          {horariosActuales.map((h) => (
            <li key={h.id} className="text-sm text-slate-500 dark:text-slate-400">
              {ETIQUETA_DIA[h.diaSemana]}: {h.horaInicio.slice(0, 5)} – {h.horaFin.slice(0, 5)}
            </li>
          ))}
          {horariosActuales.length === 0 && (
            <li className="text-sm text-slate-400 dark:text-slate-600">Sin horarios cargados.</li>
          )}
        </ul>
        {puedeEditar && (
          <button
            type="button"
            onClick={empezarEdicion}
            className="mt-2 rounded text-sm font-medium text-teal-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-400"
          >
            Editar horarios
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Editar horarios (reemplaza el set completo)
      </h4>
      <div className="mt-2 space-y-2">
        {filas.map((fila, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={fila.diaSemana}
              onChange={(e) => actualizarFila(i, { diaSemana: Number(e.target.value) as DiaSemana })}
              className={`${claseCampo()} w-auto`}
            >
              {Object.entries(ETIQUETA_DIA).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={fila.horaInicio}
              onChange={(e) => actualizarFila(i, { horaInicio: e.target.value })}
              className={`${claseCampo()} w-auto`}
            />
            <input
              type="time"
              value={fila.horaFin}
              onChange={(e) => actualizarFila(i, { horaFin: e.target.value })}
              className={`${claseCampo()} w-auto`}
            />
            <button
              type="button"
              onClick={() => setFilas((prev) => prev.filter((_, idx) => idx !== i))}
              className="rounded text-xs font-medium text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-red-400"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button variante="secundario" tamano="sm" onClick={() => setFilas((prev) => [...prev, filaVacia()])}>
          + Agregar franja
        </Button>
      </div>

      {error && (
        <Alert tono="error" className="mt-2">
          {error}
        </Alert>
      )}

      <div className="mt-3 flex gap-2">
        <Button tamano="sm" onClick={guardar} disabled={guardando || filas.length === 0}>
          Guardar
        </Button>
        <Button variante="secundario" tamano="sm" onClick={() => setEditando(false)} disabled={guardando}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
