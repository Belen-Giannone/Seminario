import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Rol } from '@syssalud/shared-types';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth-context';
import { ApiError, api, type HistoriaClinica } from '../lib/api';

export function HistoriaClinicaPage() {
  const { usuario, token, logout } = useAuth();
  const [criterio, setCriterio] = useState('');
  const [historia, setHistoria] = useState<HistoriaClinica | null>(null);
  const [form, setForm] = useState({ observaciones: '', antecedentes: '', tratamientos: '', turnoId: '' });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  if (!usuario || !token) return <Navigate to="/login" replace />;
  if (usuario.rol !== Rol.PROFESIONAL) return <Navigate to="/dashboard" replace />;

  const ejecutar = async (accion: () => Promise<void>) => {
    setError('');
    setMensaje('');
    try {
      await accion();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la operación');
    }
  };

  const buscar = (event: FormEvent) => {
    event.preventDefault();
    void ejecutar(async () => {
      const resultado = await api.historiaClinica.buscar(criterio, token);
      setHistoria(resultado);
    });
  };

  const inicializar = () => {
    void ejecutar(async () => {
      const resultado = await api.historiaClinica.inicializar(criterio, token);
      setHistoria(resultado);
      setMensaje('Historia clínica inicializada correctamente.');
    });
  };

  const agregarEntrada = (event: FormEvent) => {
    event.preventDefault();
    void ejecutar(async () => {
      await api.historiaClinica.agregarEntrada(criterio, { ...form, turnoId: form.turnoId || undefined }, token);
      setHistoria(await api.historiaClinica.obtener(criterio, token));
      setForm({ observaciones: '', antecedentes: '', tratamientos: '', turnoId: '' });
      setMensaje('Historia clínica actualizada correctamente.');
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand subtitle="Historia clínica" />
          <div className="flex items-center gap-3"><ThemeToggle /><button type="button" onClick={logout} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">Cerrar sesión</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="font-mono text-xs uppercase text-teal-600 dark:text-teal-400">CUU09 · RN10</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">Gestionar historia clínica</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Buscá un paciente por su identificador.</p>
        <form onSubmit={buscar} className="mt-8 flex gap-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <input value={criterio} onChange={(event) => setCriterio(event.target.value)} placeholder="pacienteId" className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
          <button type="submit" className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white">Buscar</button>
          <button type="button" onClick={inicializar} disabled={!criterio} className="rounded-md border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 disabled:opacity-40 dark:text-teal-300">Inicializar</button>
        </form>
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        {mensaje && <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-950/30 dark:text-teal-300">{mensaje}</p>}
        {historia && <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-semibold dark:text-slate-50">{historia.nomAppPac || historia.pacienteId}</h2><p className="mt-1 text-sm text-slate-500">{historia.entradas.length} entradas</p><div className="mt-6 space-y-4">{historia.entradas.map((entrada) => <article key={entrada.id} className="border-l-2 border-teal-500 pl-4"><p className="font-mono text-xs text-teal-700 dark:text-teal-300">{entrada.fecha}</p><p className="mt-1 text-sm dark:text-slate-300">{entrada.observaciones || 'Sin observaciones.'}</p><p className="text-sm text-slate-500">{entrada.tratamientos || 'Sin tratamientos.'}</p></article>)}</div></section>
          <form onSubmit={agregarEntrada} className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold dark:text-slate-50">Nueva entrada</h2>{(['observaciones', 'antecedentes', 'tratamientos', 'turnoId'] as const).map((campo) => <label key={campo} className="mt-4 block text-sm dark:text-slate-300">{campo}<textarea value={form[campo]} onChange={(event) => setForm({ ...form, [campo]: event.target.value })} rows={campo === 'turnoId' ? 1 : 3} className="mt-1 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" /></label>)}<button type="submit" className="mt-5 w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white">Registrar información</button></form>
        </div>}
      </main>
    </div>
  );
}
