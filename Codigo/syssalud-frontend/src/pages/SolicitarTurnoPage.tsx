import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EstadoTurno,
  MetodoPago,
  Rol,
  type LiquidacionPago,
  type PacienteResumen,
  type ProfesionalDelServicio,
  type Servicio,
  type SlotDisponible,
  type Turno,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { FormField, SelectField } from '../components/FormField';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { formatoPrecio } from './ServiciosPage';

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  [MetodoPago.TARJETA]: 'Tarjeta',
  [MetodoPago.TRANSFERENCIA]: 'Transferencia',
  [MetodoPago.BILLETERA_VIRTUAL]: 'Billetera virtual',
};

function mensajeDe(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

type Paso =
  | { nombre: 'form' }
  | { nombre: 'pago'; turnoId: string; liquidacion: LiquidacionPago }
  | { nombre: 'resultado'; turno: Turno };

/** CUU02 — Solicitud y Agenda de Turno + Pasarela de Pago (TUR-037/038). */
export function SolicitarTurnoPage() {
  return (
    <AppShell roles={[Rol.PACIENTE, Rol.ASISTENTE]}>
      <Wizard />
    </AppShell>
  );
}

function Wizard() {
  const { usuario, token } = useAuth();
  const [paso, setPaso] = useState<Paso>({ nombre: 'form' });
  const [rechazado, setRechazado] = useState(false);

  if (!token || !usuario) return null;

  return (
    <>
      <PageHeader eyebrow="CUU02 · Turnos" titulo="Solicitar turno" descripcion="Elegí servicio, profesional y horario." />

      <div className="mt-6 max-w-lg">
        {paso.nombre === 'form' && (
          <FormularioSolicitud
            esAsistente={usuario.rol === Rol.ASISTENTE}
            token={token}
            onSolicitado={(turnoId, liquidacion) => {
              setRechazado(false);
              setPaso({ nombre: 'pago', turnoId, liquidacion });
            }}
          />
        )}
        {paso.nombre === 'pago' && (
          <PasarelaPago
            token={token}
            turnoId={paso.turnoId}
            liquidacion={paso.liquidacion}
            onConfirmado={(turno) => setPaso({ nombre: 'resultado', turno })}
            onRechazado={() => setRechazado(true)}
          />
        )}
        {paso.nombre === 'resultado' && <Resultado turno={paso.turno} />}
        {rechazado && paso.nombre === 'pago' && (
          <Alert tono="error" className="mt-4">
            La transacción de pago fue rechazada. El turno no pudo ser confirmado. Podés reintentar con otro método.
          </Alert>
        )}
      </div>
    </>
  );
}

interface FormularioSolicitudProps {
  esAsistente: boolean;
  token: string;
  onSolicitado: (turnoId: string, liquidacion: LiquidacionPago) => void;
}

function FormularioSolicitud({ esAsistente, token, onSolicitado }: FormularioSolicitudProps) {
  const [pacienteId, setPacienteId] = useState('');
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioId, setServicioId] = useState('');
  const [profesionales, setProfesionales] = useState<ProfesionalDelServicio[]>([]);
  const [profesionalId, setProfesionalId] = useState('');
  const [fecha, setFecha] = useState('');
  const [slots, setSlots] = useState<SlotDisponible[] | null>(null);
  const [hora, setHora] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // SER-035: catálogo de servicios activos con su precio.
  useEffect(() => {
    api.servicios
      .listar(token, true)
      .then(setServicios)
      .catch((err: unknown) => setError(mensajeDe(err, 'No se pudo cargar el catálogo de servicios.')));
  }, [token]);

  // Al elegir servicio, sólo se ofrecen los profesionales que lo brindan.
  useEffect(() => {
    setProfesionalId('');
    setProfesionales([]);
    if (!servicioId) return;
    api.servicios
      .profesionales(servicioId, token)
      .then(setProfesionales)
      .catch((err: unknown) => setError(mensajeDe(err, 'No se pudieron cargar los profesionales.')));
  }, [servicioId, token]);

  // Horarios libres según la Agenda (RN07, RN08, RN09).
  useEffect(() => {
    setHora('');
    setSlots(null);
    if (!servicioId || !profesionalId || !fecha) return;
    let vigente = true;
    api.agenda
      .disponibilidad(profesionalId, { servicioId, desde: fecha, hasta: fecha }, token)
      .then((libres) => {
        if (vigente) setSlots(libres);
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDe(err, 'No se pudo consultar la disponibilidad.'));
      });
    return () => {
      vigente = false;
    };
  }, [servicioId, profesionalId, fecha, token]);

  const servicio = servicios.find((s) => s.id === servicioId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { turno, liquidacion } = await api.turnos.solicitar(
        { servicioId, profesionalId, fecha, hora, ...(esAsistente ? { pacienteId } : {}) },
        token,
      );
      onSolicitado(turno.id, liquidacion);
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo solicitar el turno.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {esAsistente && <SelectorPaciente token={token} onSeleccionar={setPacienteId} />}
        <SelectField id="servicio" label="Servicio" value={servicioId} onChange={(e) => setServicioId(e.target.value)} required>
          <option value="">{servicios.length ? 'Elegí un servicio' : 'No hay servicios disponibles'}</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre} · {formatoPrecio.format(s.precio)} · {s.duracionMin} min
            </option>
          ))}
        </SelectField>
        <SelectField
          id="profesional"
          label="Profesional"
          value={profesionalId}
          onChange={(e) => setProfesionalId(e.target.value)}
          disabled={!servicioId}
          required
        >
          <option value="">{servicioId ? 'Elegí un profesional' : 'Primero elegí el servicio'}</option>
          {profesionales.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombreCompleto || 'Profesional'}
              {p.especialidad ? ` · ${p.especialidad}` : ''}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          <SelectField
            id="hora"
            label="Hora"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            disabled={!slots?.length}
            required
          >
            <option value="">
              {slots === null ? 'Elegí profesional y fecha' : slots.length ? 'Elegí un horario' : 'Sin horarios libres'}
            </option>
            {slots?.map((slot) => (
              <option key={slot.hora} value={slot.hora}>
                {slot.hora}
              </option>
            ))}
          </SelectField>
        </div>
        {slots?.length === 0 && (
          <Alert tono="info">No hay horarios disponibles ese día (fin de semana, feriado o agenda completa).</Alert>
        )}
        {servicio && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monto a abonar: <span className="font-medium text-slate-900 dark:text-slate-50">{formatoPrecio.format(servicio.precio)}</span>
          </p>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" disabled={enviando || !hora || (esAsistente && !pacienteId)} className="flex-1">
            {enviando ? 'Solicitando…' : 'Solicitar turno'}
          </Button>
          <Link to="/turnos" className="shrink-0">
            <Button type="button" variante="secundario" disabled={enviando}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}

interface SelectorPacienteProps {
  token: string;
  onSeleccionar: (pacienteId: string) => void;
}

/** El asistente busca al paciente por DNI o apellido (Pacientes, PAC-014). */
function SelectorPaciente({ token, onSeleccionar }: SelectorPacienteProps) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<PacienteResumen[]>([]);
  const [elegido, setElegido] = useState<PacienteResumen | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (elegido || busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    let vigente = true;
    setBuscando(true);
    const timer = setTimeout(() => {
      api.pacientes
        .buscar(busqueda, token)
        .then((lista) => {
          if (vigente) setResultados(lista.slice(0, 6));
        })
        .catch(() => {
          if (vigente) setResultados([]);
        })
        .finally(() => {
          if (vigente) setBuscando(false);
        });
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [busqueda, elegido, token]);

  if (elegido) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Paciente</span>
        <div className="flex items-center justify-between rounded-md border border-teal-500 bg-teal-50/60 px-3 py-2 text-sm dark:bg-teal-500/10">
          <span>
            <span className="font-medium text-slate-900 dark:text-slate-50">{elegido.nombreCompleto}</span>
            <span className="ml-2 font-mono text-slate-500 dark:text-slate-400">DNI {elegido.dni}</span>
          </span>
          <Button
            tamano="sm"
            variante="fantasma"
            onClick={() => {
              setElegido(null);
              onSeleccionar('');
            }}
          >
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <FormField
        id="paciente"
        label="Paciente"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por DNI o apellido"
        autoComplete="off"
      />
      {busqueda.trim().length >= 2 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              {buscando ? 'Buscando…' : 'No se encontraron pacientes.'}
            </li>
          ) : (
            resultados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setElegido(p);
                    onSeleccionar(p.id);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-50">{p.nombreCompleto}</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">DNI {p.dni}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

interface PasarelaPagoProps {
  token: string;
  turnoId: string;
  liquidacion: LiquidacionPago;
  onConfirmado: (turno: Turno) => void;
  onRechazado: () => void;
}

function PasarelaPago({ token, turnoId, liquidacion, onConfirmado, onRechazado }: PasarelaPagoProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(MetodoPago.TARJETA);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pagar = async () => {
    setError('');
    setEnviando(true);
    try {
      const idTransaccion = crypto.randomUUID();
      const turno = await api.turnos.pagar(turnoId, { metodoPago, idTransaccion }, token);
      onConfirmado(turno);
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        onRechazado();
      } else {
        setError(mensajeDe(err, 'No se pudo procesar el pago.'));
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Pasarela de pago</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Fecha y hora</dt>
          <dd className="text-slate-900 dark:text-slate-100">
            {liquidacion.fecha} {liquidacion.hora}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Monto</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            ${liquidacion.monto.toLocaleString('es-AR')}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <SelectField
          label="Método de pago"
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
        >
          {Object.values(MetodoPago).map((metodo) => (
            <option key={metodo} value={metodo}>
              {ETIQUETA_METODO[metodo]}
            </option>
          ))}
        </SelectField>
      </div>

      {error && (
        <Alert tono="error" className="mt-4">
          {error}
        </Alert>
      )}

      <Button onClick={pagar} disabled={enviando} className="mt-5 w-full">
        {enviando ? 'Procesando…' : 'Pagar'}
      </Button>
    </Card>
  );
}

function Resultado({ turno }: { turno: Turno }) {
  const navigate = useNavigate();
  const confirmado = turno.estado === EstadoTurno.CONFIRMADO;

  return (
    <Card className="p-5 text-center">
      {confirmado ? (
        <>
          <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Turno confirmado</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
            {turno.fecha} · {turno.hora}
          </h2>
          {turno.comprobanteNumero && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Comprobante: {turno.comprobanteNumero}</p>
          )}
        </>
      ) : (
        <Alert tono="info">
          El turno quedó reservado, pero el pago no se pudo procesar en este momento (Pagos no disponible). Podés
          reintentarlo luego desde "Mis turnos".
        </Alert>
      )}
      <Button onClick={() => navigate('/turnos')} className="mt-5 w-full">
        Ver mis turnos
      </Button>
    </Card>
  );
}
