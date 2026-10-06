import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EstadoTurno, MetodoPago, Rol, type LiquidacionPago, type Turno } from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button } from '../components/Button';
import { FormField, SelectField } from '../components/FormField';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

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
  const [servicioId, setServicioId] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

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
        {esAsistente && (
          <FormField
            label="Id del paciente"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            placeholder="UUID del paciente"
            required
          />
        )}
        <FormField
          label="Id del servicio"
          value={servicioId}
          onChange={(e) => setServicioId(e.target.value)}
          placeholder="UUID del servicio"
          required
        />
        <FormField
          label="Id del profesional"
          value={profesionalId}
          onChange={(e) => setProfesionalId(e.target.value)}
          placeholder="UUID del profesional"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          <FormField label="Hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
        </div>

        {error && <Alert tono="error">{error}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" disabled={enviando} className="flex-1">
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
