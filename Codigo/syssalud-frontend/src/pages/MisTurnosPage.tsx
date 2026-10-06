import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EstadoTurno, Rol, type TurnoResumen } from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button, claseBoton } from '../components/Button';
import { claseCampo } from '../components/FormField';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const ETIQUETA_ESTADO: Record<EstadoTurno, { etiqueta: string; clase: string }> = {
  [EstadoTurno.SOLICITADO]: {
    etiqueta: 'Solicitado (esperando pago)',
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
  [EstadoTurno.NO_CONFIRMADO]: {
    etiqueta: 'No confirmado',
    clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  [EstadoTurno.CANCELADO]: {
    etiqueta: 'Cancelado',
    clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
  [EstadoTurno.ASISTIDO]: {
    etiqueta: 'Asistido',
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

/** CUU03/CUU04 — panel de turnos vigentes con Cancelar/Reprogramar (TUR-039). */
export function MisTurnosPage() {
  return (
    <AppShell roles={[Rol.PACIENTE, Rol.ASISTENTE]}>
      <Turnos />
    </AppShell>
  );
}

function Turnos() {
  const { usuario, token } = useAuth();
  const [pacienteId, setPacienteId] = useState('');
  const [turnos, setTurnos] = useState<TurnoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [accion, setAccion] = useState<{ id: string; tipo: 'cancelar' | 'reprogramar' } | null>(null);

  const esAsistente = usuario?.rol === Rol.ASISTENTE;

  useEffect(() => {
    if (!token) return;
    if (esAsistente && !pacienteId.trim()) {
      setTurnos([]);
      setCargando(false);
      return;
    }
    let vigente = true;
    setCargando(true);
    const cargar = esAsistente
      ? api.turnos.listar({ pacienteId: pacienteId.trim() }, token)
      : api.turnos.misTurnos(token);
    cargar
      .then((lista) => {
        if (!vigente) return;
        setTurnos(lista);
        setError('');
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDe(err, 'No se pudieron cargar los turnos.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [token, esAsistente, pacienteId, recarga]);

  if (!token) return null;

  return (
    <>
      <PageHeader
        eyebrow="CUU02-04 · Turnos"
        titulo="Mis turnos"
        descripcion="Turnos vigentes: cancelá o reprogramá desde acá."
        acciones={
          <Link to="/turnos/nuevo" className={claseBoton()}>
            + Solicitar turno
          </Link>
        }
      />

      {esAsistente && (
        <Card className="mt-6 p-4">
          <label htmlFor="pacienteId" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Id del paciente
          </label>
          <input
            id="pacienteId"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            placeholder="UUID del paciente (ver su ficha en Pacientes)"
            className={`${claseCampo()} mt-1.5`}
          />
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        {error ? (
          <div className="p-4">
            <Alert tono="error">{error}</Alert>
          </div>
        ) : (
          <TablaTurnos
            turnos={turnos}
            cargando={cargando}
            vacio={esAsistente && !pacienteId.trim() ? 'Ingresá el id de un paciente para ver sus turnos.' : undefined}
            restriccion24h={!esAsistente}
            accionEnCurso={accion}
            onCancelar={(id) => setAccion({ id, tipo: 'cancelar' })}
            onReprogramar={(id) => setAccion({ id, tipo: 'reprogramar' })}
          />
        )}
      </Card>

      {accion && (
        <ModalAccion
          tipo={accion.tipo}
          token={token}
          turnoId={accion.id}
          onCerrar={() => setAccion(null)}
          onListo={() => {
            setAccion(null);
            setRecarga((n) => n + 1);
          }}
        />
      )}
    </>
  );
}

interface TablaTurnosProps {
  turnos: TurnoResumen[];
  cargando: boolean;
  vacio?: string;
  /** RN12/RN22: si aplica, el PACIENTE no puede gestionar con menos de 24h de anticipación. */
  restriccion24h: boolean;
  accionEnCurso: { id: string; tipo: 'cancelar' | 'reprogramar' } | null;
  onCancelar: (id: string) => void;
  onReprogramar: (id: string) => void;
}

/** RN12/RN22: horas hasta el turno, en hora local (coincide con cómo el backend parsea `fecha`+`hora`). */
function horasHastaElTurno(fecha: string, hora: string): number {
  return (new Date(`${fecha}T${hora}:00`).getTime() - Date.now()) / 3_600_000;
}

function TablaTurnos({ turnos, cargando, vacio, restriccion24h, accionEnCurso, onCancelar, onReprogramar }: TablaTurnosProps) {
  if (vacio) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{vacio}</p>
      </div>
    );
  }

  if (cargando && turnos.length === 0) {
    return (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800" aria-label="Cargando turnos">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3.5">
            <span className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <span className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <span className="ml-auto h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </li>
        ))}
      </ul>
    );
  }

  if (turnos.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No hay turnos vigentes.</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Usá "Solicitar turno" para pedir uno nuevo.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto transition-opacity ${cargando ? 'opacity-60' : ''}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th scope="col" className="px-4 py-2.5 font-medium">
              Fecha
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Hora
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Estado
            </th>
            <th scope="col" className="px-4 py-2.5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {turnos.map((turno) => {
            const estado = ETIQUETA_ESTADO[turno.estado];
            const activo = accionEnCurso?.id === turno.idTurno;
            const puedeGestionar = turno.estado === EstadoTurno.CONFIRMADO || turno.estado === EstadoTurno.REPROGRAMADO;
            const fueraDePlazo = restriccion24h && horasHastaElTurno(turno.fecha, turno.hora) < 24;
            return (
              <tr key={turno.idTurno} className={activo ? 'bg-teal-50/60 dark:bg-teal-500/5' : ''}>
                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{formatearFecha(turno.fecha)}</td>
                <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">{turno.hora}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estado.clase}`}>
                    {estado.etiqueta}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {puedeGestionar && (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex justify-end gap-2">
                        <Button
                          variante="secundario"
                          tamano="sm"
                          disabled={fueraDePlazo}
                          onClick={() => onReprogramar(turno.idTurno)}
                        >
                          Reprogramar
                        </Button>
                        <Button
                          variante="secundario"
                          tamano="sm"
                          disabled={fueraDePlazo}
                          onClick={() => onCancelar(turno.idTurno)}
                        >
                          Cancelar
                        </Button>
                      </div>
                      {fueraDePlazo && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Fuera de plazo: faltan menos de 24hs. Contactá a la asistente.
                        </p>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ModalAccionProps {
  tipo: 'cancelar' | 'reprogramar';
  token: string;
  turnoId: string;
  onCerrar: () => void;
  onListo: () => void;
}

/** TUR-039: confirmación crítica + alerta taxativa si el PACIENTE está fuera del plazo de 24h. */
function ModalAccion({ tipo, token, turnoId, onCerrar, onListo }: ModalAccionProps) {
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setError('');
    setEnviando(true);
    try {
      if (tipo === 'cancelar') {
        await api.turnos.cancelar(turnoId, undefined, token);
      } else {
        await api.turnos.reprogramar(turnoId, { fecha, hora }, token);
      }
      onListo();
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo completar la acción.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <Card className="w-full max-w-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {tipo === 'cancelar' ? 'Cancelar turno' : 'Reprogramar turno'}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {tipo === 'cancelar'
            ? 'Esta acción no se puede deshacer. Si corresponde, la devolución la gestiona la asistente manualmente.'
            : 'Elegí la nueva fecha y hora para el mismo servicio y profesional.'}
        </p>

        {tipo === 'reprogramar' && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="r-fecha" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Fecha
              </label>
              <input
                id="r-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={claseCampo()}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="r-hora" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Hora
              </label>
              <input
                id="r-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className={claseCampo()}
              />
            </div>
          </div>
        )}

        {error && (
          <Alert tono="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-5 flex gap-2">
          <Button
            onClick={confirmar}
            disabled={enviando || (tipo === 'reprogramar' && (!fecha || !hora))}
            className="flex-1"
          >
            {enviando ? 'Confirmando…' : 'Confirmar'}
          </Button>
          <Button variante="secundario" onClick={onCerrar} disabled={enviando}>
            Volver
          </Button>
        </div>
      </Card>
    </div>
  );
}
