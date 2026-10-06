import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { servicios, profesionales } from '../../lib/api';
import type { CrearServicioRequest, ActualizarServicioRequest, ProfesionalResumen } from '@syssalud/shared-types';
import { AppShell, PageHeader, Card } from '../../components/AppShell';
import { Button } from '../../components/Button';
import { FormField, TextAreaField, SelectField } from '../../components/FormField';
import { AGENDA_BLOQUE_MINUTOS } from '@syssalud/shared-types';

const MIN_DURACION = AGENDA_BLOQUE_MINUTOS;
const MAX_DURACION = 480;

export function ServicioForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [profesionalesList, setProfesionalesList] = useState<ProfesionalResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<CrearServicioRequest | ActualizarServicioRequest>({
    nombre: '',
    descripcion: '',
    duracionMin: MIN_DURACION,
    precio: 0,
    profesionalIds: [],
  });

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Cargar profesionales
      const profs = await profesionales.listar(token);
      setProfesionalesList(profs.filter(p => p.nombreCompleto !== null));

      // Si es edición, cargar servicio existente
      if (isEditing) {
        const servicio = await servicios.obtener(token, id!);
        setFormValues({
          nombre: servicio.nombre,
          descripcion: servicio.descripcion,
          duracionMin: servicio.duracionMin,
          precio: servicio.precio,
          profesionalIds: servicio.profesionales?.map(p => p.id) || [],
        });
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
      setErrors({ general: 'Error al cargar los datos. Intente nuevamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formValues, value: string | number | string[]) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (!formValues.nombre?.trim()) {
      nuevosErrores.nombre = 'El nombre es obligatorio';
    } else if (formValues.nombre.length > 200) {
      nuevosErrores.nombre = 'Máximo 200 caracteres';
    }

    if (!formValues.descripcion?.trim()) {
      nuevosErrores.descripcion = 'La descripción es obligatoria';
    }

    if (!formValues.duracionMin || formValues.duracionMin < MIN_DURACION) {
      nuevosErrores.duracionMin = `Mínimo ${MIN_DURACION} minutos`;
    } else if (formValues.duracionMin > MAX_DURACION) {
      nuevosErrores.duracionMin = `Máximo ${MAX_DURACION} minutos`;
    } else if (formValues.duracionMin % MIN_DURACION !== 0) {
      nuevosErrores.duracionMin = `Debe ser múltiplo de ${MIN_DURACION}`;
    }

    if (formValues.precio === undefined || formValues.precio === null || formValues.precio < 0) {
      nuevosErrores.precio = 'El precio debe ser mayor o igual a 0';
    }

    if (!formValues.profesionalIds || formValues.profesionalIds.length === 0) {
      nuevosErrores.profesionalIds = 'Seleccione al menos un profesional';
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) return;
    if (!token) return;

    try {
      setLoading(true);

      if (isEditing) {
        await servicios.actualizar(token, id!, formValues as ActualizarServicioRequest);
      } else {
        await servicios.crear(token, formValues as CrearServicioRequest);
      }

      navigate('/staff/servicios');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setErrors({
        general: `Error al guardar: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isEditing) {
    return (
      <AppShell roles={['ASISTENTE', 'DUENO']} esPanel={false}>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell roles={['ASISTENTE', 'DUENO']} esPanel={false}>
      <PageHeader
        eyebrow={isEditing ? 'CUU10' : 'CUU10'}
        titulo={isEditing ? 'Editar servicio' : 'Nuevo servicio'}
        descripcion="Complete los datos del servicio médico estético"
      />

      <Card className="mt-6 p-6">
        {errors.general && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              id="nombre"
              label="Nombre del servicio"
              value={formValues.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Ej: Consulta dermatológica"
              error={errors.nombre}
              autoComplete="off"
            />

            <SelectField
              id="duracionMin"
              label="Duración (minutos)"
              value={formValues.duracionMin?.toString() ?? ''}
              onChange={(e) => handleChange('duracionMin', parseInt(e.target.value))}
              error={errors.duracionMin}
            >
              {Array.from(
                { length: MAX_DURACION / MIN_DURACION },
                (_, i) => i * MIN_DURACION + MIN_DURACION
              ).map((min) => (
                <option key={min} value={min}>
                  {min} minutos
                </option>
              ))}
            </SelectField>

            <FormField
              id="precio"
              label="Precio (ARS)"
              type="number"
              value={formValues.precio?.toString() ?? ''}
              onChange={(e) => handleChange('precio', parseFloat(e.target.value))}
              placeholder="0.00"
              step="0.01"
              min="0"
              error={errors.precio}
            />

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Profesionales <span className="text-red-500">*</span>
              </label>
              <select
                id="profesionalIds"
                multiple
                value={formValues.profesionalIds || []}
                onChange={(e) =>
                  handleChange(
                    'profesionalIds',
                    Array.from(e.target.selectedOptions, (opt) => opt.value)
                  )
                }
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-900 ${
                  errors.profesionalIds
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30'
                }`}
                style={{ height: `${Math.min(profesionalesList.length * 40, 200)}px` }}
              >
                {profesionalesList.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nombreCompleto}
                  </option>
                ))}
              </select>
              {errors.profesionalIds && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.profesionalIds}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mantenga presionado Ctrl (⌘ en Mac) para seleccionar varios
              </p>
            </div>
          </div>

          <TextAreaField
            id="descripcion"
            label="Descripción"
            value={formValues.descripcion}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Describa el servicio..."
            error={errors.descripcion}
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variante="secundario"
              type="button"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button variante="primario" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}