import { useState, useEffect, useCallback } from 'react';
import { servicios } from '../lib/api';
import type { ServicioResumen, ProfesionalResumen } from '@syssalud/shared-types';

interface Props {
  token: string;
  value?: string;
  onChange: (servicioId: string | null) => void;
  onProfessionalChange?: (profesionalIds: string[]) => void;
  disabled?: boolean;
}

export function ServicioSelector({
  token,
  value,
  onChange,
  onProfessionalChange,
  disabled = false
}: Props) {
  const [serviciosList, setServiciosList] = useState<ServicioResumen[]>([]);
  const [profesionalesDelServicio, setProfesionalesDelServicio] = useState<ProfesionalResumen[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      cargarServicios();
    }
  }, [token]);

  useEffect(() => {
    if (value && token) {
      cargarProfesionales(value);
    } else {
      setProfesionalesDelServicio([]);
      onProfessionalChange?.([]);
    }
  }, [value, token]);

  const cargarServicios = async () => {
    try {
      setLoading(true);
      const data = await servicios.listar(token, true);
      setServiciosList(data);
    } catch (err) {
      console.error('Error cargando servicios:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarProfesionales = useCallback(async (servicioId: string) => {
    try {
      const profs = await servicios.profesionales(token, servicioId);
      setProfesionalesDelServicio(profs);
      onProfessionalChange?.(profs.map(p => p.id));
    } catch (err) {
      console.error('Error cargando profesionales:', err);
      setProfesionalesDelServicio([]);
    }
  }, [token, onProfessionalChange]);

  const servicioActual = serviciosList.find(s => s.id === value);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Servicio <span className="text-red-500">*</span>
        </label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled || loading}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white shadow-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        >
          <option value="">Seleccione un servicio</option>
          {serviciosList.map((servicio) => (
            <option key={servicio.id} value={servicio.id}>
              {servicio.nombre} - ${servicio.precio.toLocaleString('es-AR')} ({servicio.duracionMin} min)
            </option>
          ))}
        </select>
      </div>

      {servicioActual && profesionalesDelServicio.length > 0 && (
        <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>{serviciosList.length} profesional(es) disponible(s)</strong>
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            {profesionalesDelServicio.map((prof) => (
              <li key={prof.id}>• {prof.nombreCompleto}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}