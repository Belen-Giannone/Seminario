import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BLOQUE_AGENDA_MIN,
  Rol,
  type CrearServicioRequest,
  type ProfesionalDelServicio,
} from '@syssalud/shared-types';
import { Alert } from '../components/Alert';
import { AppShell, Card, PageHeader } from '../components/AppShell';
import { Button, claseBoton } from '../components/Button';
import { FormField, SelectField, TextAreaField } from '../components/FormField';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const DURACION_MAX = 480;
const DURACIONES = Array.from(
  { length: DURACION_MAX / BLOQUE_AGENDA_MIN },
  (_, i) => (i + 1) * BLOQUE_AGENDA_MIN,
);

const FORM_VACIO: CrearServicioRequest = {
  nombre: '',
  descripcion: '',
  duracionMin: 30,
  precio: 0,
  profesionalIds: [],
};

/** CUU10 — alta (camino básico) y modificación (`1.a`, `4.a`) de un servicio. */
export function ServicioFormPage() {
  return (
    <AppShell roles={[Rol.ASISTENTE]}>
      <FormularioServicio />
    </AppShell>
  );
}

function FormularioServicio() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editando = Boolean(id);

  const [form, setForm] = useState(FORM_VACIO);
  const [precioTexto, setPrecioTexto] = useState('');
  const [profesionales, setProfesionales] = useState<ProfesionalDelServicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let vigente = true;
    Promise.all([api.profesionales.listar({ activos: true }, token), id ? api.servicios.obtener(id, token) : null])
      .then(([activos, servicio]) => {
        if (!vigente) return;
        // Se suman los ya asociados aunque hoy estén inactivos, para no perderlos al editar.
        const asociados = servicio?.profesionales.filter((p) => !activos.some((a) => a.id === p.id)) ?? [];
        setProfesionales([...activos, ...asociados]);
        if (servicio) {
          setForm({
            nombre: servicio.nombre,
            descripcion: servicio.descripcion,
            duracionMin: servicio.duracionMin,
            precio: servicio.precio,
            profesionalIds: servicio.profesionales.map((p) => p.id),
          });
          setPrecioTexto(String(servicio.precio));
        }
      })
      .catch((err: unknown) => {
        if (vigente) setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los datos.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [token, id]);

  if (!token) return null;

  const alternarProfesional = (profesionalId: string) =>
    setForm((prev) => ({
      ...prev,
      profesionalIds: prev.profesionalIds.includes(profesionalId)
        ? prev.profesionalIds.filter((p) => p !== profesionalId)
        : [...prev.profesionalIds, profesionalId],
    }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const precio = Number(precioTexto.replace(',', '.'));
    if (precioTexto.trim() === '' || Number.isNaN(precio) || precio < 0) {
      setError('Ingresá un precio válido (mayor o igual a 0).');
      return;
    }
    if (form.profesionalIds.length === 0) {
      setError('Seleccioná al menos un profesional que brinde el servicio.');
      return;
    }
    setEnviando(true);
    try {
      const datos = { ...form, precio: Math.round(precio * 100) / 100 };
      if (id) await api.servicios.actualizar(id, datos, token);
      else await api.servicios.crear(datos, token);
      navigate('/servicios');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el servicio.');
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="CUU10 · Servicios"
        titulo={editando ? 'Editar servicio' : 'Nuevo servicio'}
        descripcion="Nombre, descripción, profesionales que lo brindan, duración y precio."
      />

      <Card className="mt-8 max-w-3xl p-6">
        {cargando ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <FormField
              id="nombre"
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Consulta dermatológica"
              maxLength={200}
              required
            />
            <TextAreaField
              id="descripcion"
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              maxLength={2000}
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="duracion"
                label="Duración"
                value={form.duracionMin}
                onChange={(e) => setForm({ ...form, duracionMin: Number(e.target.value) })}
              >
                {DURACIONES.map((min) => (
                  <option key={min} value={min}>
                    {min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ''}`}
                  </option>
                ))}
              </SelectField>
              <FormField
                id="precio"
                label="Precio (ARS)"
                inputMode="decimal"
                value={precioTexto}
                onChange={(e) => setPrecioTexto(e.target.value)}
                placeholder="15000"
                required
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Profesionales que lo brindan
              </legend>
              {profesionales.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No hay profesionales activos.</p>
              ) : (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {profesionales.map((p) => {
                    const marcado = form.profesionalIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-theme ${
                          marcado
                            ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-500/10'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarProfesional(p.id)}
                          className="h-4 w-4 accent-teal-600"
                        />
                        <span>
                          <span className="block font-medium text-slate-900 dark:text-slate-50">
                            {p.nombreCompleto || 'Profesional sin nombre'}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {p.especialidad}
                            {p.activo === false ? ' · inactivo' : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {error && <Alert tono="error">{error}</Alert>}

            <div className="flex gap-2">
              <Button type="submit" disabled={enviando}>
                {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear servicio'}
              </Button>
              <Link to="/servicios" className={claseBoton('secundario')}>
                Cancelar
              </Link>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
