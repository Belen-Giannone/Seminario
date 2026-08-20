import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { FormField } from '../components/FormField';
import { ThemeToggle } from '../components/ThemeToggle';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

const vacio = {
  nombre: '',
  apellido: '',
  dni: '',
  fechaNacimiento: '',
  telefono: '',
  domicilio: '',
  email: '',
  password: '',
};

export function RegisterPage() {
  const { register, usuario, cargando } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(vacio);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) return <Navigate to="/dashboard" replace />;

  function actualizar<K extends keyof typeof vacio>(campo: K) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [campo]: e.target.value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="flex items-center justify-between px-6 py-5">
        <Brand subtitle="Registro de paciente" />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-lg">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Crear cuenta de paciente
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            CUU01 — completá tus datos para poder solicitar turnos en SysSalud.
          </p>

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField id="nombre" label="Nombre" value={form.nombre} onChange={actualizar('nombre')} required />
              <FormField id="apellido" label="Apellido" value={form.apellido} onChange={actualizar('apellido')} required />
              <FormField
                id="dni"
                label="DNI"
                inputMode="numeric"
                pattern="\d{7,8}"
                placeholder="30111222"
                value={form.dni}
                onChange={actualizar('dni')}
                required
              />
              <FormField
                id="fechaNacimiento"
                label="Fecha de nacimiento"
                type="date"
                value={form.fechaNacimiento}
                onChange={actualizar('fechaNacimiento')}
                required
              />
              <FormField id="telefono" label="Teléfono" value={form.telefono} onChange={actualizar('telefono')} required />
              <FormField id="domicilio" label="Domicilio" value={form.domicilio} onChange={actualizar('domicilio')} required />
            </div>

            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={actualizar('email')}
              required
            />
            <FormField
              id="password"
              label="Contraseña"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={actualizar('password')}
              required
            />

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-theme hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-500 dark:hover:bg-teal-400 dark:focus-visible:ring-offset-slate-950"
            >
              {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
