import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rol, type Servicio } from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button, claseBoton } from '../components/Button';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

export const formatoPrecio = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

function mensajeDe(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** CUU10 — Catálogo de servicios (SER-034). Sólo ASISTENTE (SER-029). */
export function ServiciosPage() {
  return (
    <AppShell roles={[Rol.ASISTENTE]}>
      <Catalogo />
    </AppShell>
  );
}

function Catalogo() {
  const { token } = useAuth();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [verBajas, setVerBajas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [confirmandoBaja, setConfirmandoBaja] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    setCargando(true);
    api.servicios
      .listar(token, !verBajas)
      .then((lista) => {
        if (!vigente) return;
        setServicios(lista);
        setError('');
      })
      .catch((err: unknown) => {
        if (vigente) setError(mensajeDe(err, 'No se pudo cargar el catálogo de servicios.'));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [token, verBajas, recarga]);

  if (!token) return null;

  const ejecutar = async (id: string, accion: () => Promise<unknown>, mensaje: string) => {
    setProcesando(id);
    setError('');
    setExito('');
    try {
      await accion();
      setExito(mensaje);
      setRecarga((n) => n + 1);
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo completar la operación.'));
    } finally {
      setProcesando(null);
      setConfirmandoBaja(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="CUU10 · Servicios"
        titulo="Catálogo de servicios"
        descripcion="Servicios que se ofrecen al reservar turnos, con su duración, precio y profesionales."
        acciones={
          <Link to="/servicios/nuevo" className={claseBoton()}>
            + Nuevo servicio
          </Link>
        }
      />

      <div className="mt-6 space-y-3">
        {error && <Alert tono="error">{error}</Alert>}
        {exito && <Alert tono="exito">{exito}</Alert>}
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="font-medium text-slate-900 dark:text-slate-50">
            {verBajas ? 'Todos los servicios' : 'Servicios activos'}
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={verBajas}
              onChange={(e) => setVerBajas(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-teal-600"
            />
            Mostrar dados de baja
          </label>
        </div>

        {cargando && servicios.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Cargando catálogo…</p>
        ) : servicios.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Todavía no hay servicios cargados.</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Usá "Nuevo servicio" para armar el catálogo.
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${cargando ? 'opacity-60' : ''}`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th scope="col" className="px-5 py-2.5 font-medium">Servicio</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Duración</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Precio</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Profesionales</th>
                  <th scope="col" className="px-5 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {servicios.map((s) => (
                  <tr key={s.id} className={s.activo ? '' : 'bg-slate-50/60 dark:bg-slate-950/40'}>
                    <td className="max-w-xs px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-50">{s.nombre}</span>
                        {!s.activo && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            De baja
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-slate-500 dark:text-slate-400">{s.descripcion}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-600 dark:text-slate-300">{s.duracionMin} min</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-mono text-slate-900 dark:text-slate-100">
                      {formatoPrecio.format(s.precio)}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                      {s.profesionales.map((p) => p.nombreCompleto || 'Sin datos').join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {confirmandoBaja === s.id ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-300">¿Dar de baja?</span>
                          <Button
                            tamano="sm"
                            disabled={procesando === s.id}
                            onClick={() => void ejecutar(s.id, () => api.servicios.darDeBaja(s.id, token), `"${s.nombre}" se dio de baja.`)}
                          >
                            Sí
                          </Button>
                          <Button tamano="sm" variante="secundario" onClick={() => setConfirmandoBaja(null)}>
                            No
                          </Button>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link to={`/servicios/${s.id}/editar`} className={claseBoton('fantasma', 'sm')}>
                            Editar
                          </Link>
                          {s.activo ? (
                            <Button tamano="sm" variante="fantasma" onClick={() => setConfirmandoBaja(s.id)}>
                              Dar de baja
                            </Button>
                          ) : (
                            <Button
                              tamano="sm"
                              variante="fantasma"
                              disabled={procesando === s.id}
                              onClick={() =>
                                void ejecutar(
                                  s.id,
                                  () => api.servicios.actualizar(s.id, { activo: true }, token),
                                  `"${s.nombre}" se reactivó.`,
                                )
                              }
                            >
                              Reactivar
                            </Button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
