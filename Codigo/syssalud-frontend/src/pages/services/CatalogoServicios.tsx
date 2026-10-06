import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { servicios } from '../../lib/api';
import type { ServicioResumen, Servicio } from '@syssalud/shared-types';
import { AppShell, PageHeader, Card } from '../../components/AppShell';
import { Button } from '../../components/Button';

export function CatalogoServicios() {
  const { token } = useAuth();
  const [serviciosList, setServiciosList] = useState<ServicioResumen[]>([]);
  const [serviciosDetallados, setServiciosDetallados] = useState<Map<string, Servicio>>(new Map());
  const [soloActivos, setSoloActivos] = useState(true);
  const [loading, setLoading] = useState(true);
  const [accionEliminando, setAccionEliminando] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      cargarServicios();
    }
  }, [token, soloActivos]);

  const cargarServicios = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await servicios.listar(token, soloActivos);
      setServiciosList(data);
    } catch (err) {
      console.error('Error cargando servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalle = async (servicioId: string) => {
    if (!token || serviciosDetallados.has(servicioId)) return;

    try {
      const detalle = await servicios.obtener(token, servicioId);
      setServiciosDetallados(prev => new Map(prev).set(servicioId, detalle));
    } catch (err) {
      console.error(`Error cargando detalle de ${servicioId}:`, err);
    }
  };

  const handleEliminar = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Dar de baja el servicio "${nombre}"?`)) return;
    if (!token) return;

    try {
      setAccionEliminando(id);
      await servicios.baja(token, id);
      cargarServicios();
    } catch (err) {
      console.error('Error eliminando:', err);
      window.alert('Error al dar de baja el servicio');
    } finally {
      setAccionEliminando(null);
    }
  };

  const columnas = useMemo(() => [
    { key: 'nombre', label: 'Servicio' },
    { key: 'duracionMin', label: 'Duración' },
    { key: 'precio', label: 'Precio (ARS)' },
    { key: 'profesionales', label: 'Profesionales' },
  ], []);

  return (
    <AppShell roles={['ASISTENTE', 'DUENO']} esPanel={false}>
      <PageHeader
        eyebrow="CUU10"
        titulo="Catálogo de servicios"
        descripcion="Mantenimiento del catálogo para agendar turnos"
        acciones={
          <>
            <Button
              variante={soloActivos ? 'secundario' : 'primario'}
              onClick={() => setSoloActivos(!soloActivos)}
            >
              {soloActivos ? 'Ver todos' : 'Ver activos'}
            </Button>
            <Link to="/staff/servicios/nuevo">
              <Button variante="primario">
                + Nuevo servicio
              </Button>
            </Link>
          </>
        }
      />

      <Card className="mt-6 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
          </div>
        ) : serviciosList.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <p className="text-slate-500 dark:text-slate-400">
              No hay{!soloActivos ? ' más' : ''} servicios{!soloActivos ? ' registrados' : ' disponibles'}
            </p>
            {!soloActivos && (
              <Link to="/staff/servicios/nuevo">
                <Button variante="primario">Crear primer servicio</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {columnas.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                {serviciosList.map((servicio) => {
                  const detalle = serviciosDetallados.get(servicio.id);
                  const profesionalesCount = detalle?.profesionales?.length || 0;

                  return (
                    <tr
                      key={servicio.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onMouseEnter={() => cargarDetalle(servicio.id)}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-slate-900 dark:text-slate-50">
                          {servicio.nombre}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 dark:text-slate-400">
                        {servicio.duracionMin} min
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-900 dark:text-slate-50">
                        ${servicio.precio.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {profesionalesCount} profesional{profesionalesCount !== 1 ? 'es' : ''}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <Link
                          to={`/staff/servicios/${servicio.id}/editar`}
                          className="mr-3 inline-block text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleEliminar(servicio.id, servicio.nombre)}
                          disabled={accionEliminando === servicio.id}
                          className="inline-block text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {accionEliminando === servicio.id ? 'Eliminando...' : 'Baja'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}