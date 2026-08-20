import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { FormField } from '../components/FormField';
import { ThemeToggle } from '../components/ThemeToggle';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth-context';

export function LoginPage() {
  const { login, usuario, cargando } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!cargando && usuario) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    return <Navigate to={destino} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login({ email, password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      {/* Panel de marca */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-teal-700 p-10 text-teal-50 lg:flex dark:bg-teal-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <span className="font-mono text-sm font-semibold tracking-tight">SysSalud</span>
        <div className="relative">
          <p className="max-w-xs text-2xl font-semibold leading-snug text-balance">
            Turnos, historia clínica y pagos, todo en un mismo lugar.
          </p>
          <p className="mt-4 max-w-xs text-sm text-teal-100/80">
            Centro de medicina estética y cirugía plástica — sistema de gestión de turnos.
          </p>
        </div>
        <p className="relative font-mono text-xs text-teal-100/60">Grupo 18 · Seminario 2026</p>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <div className="lg:hidden">
            <Brand />
          </div>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Iniciar sesión
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ingresá con tus credenciales de SysSalud.
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
              <FormField
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="nombre@syssalud.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FormField
                id="password"
                label="Contraseña"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                Registrate como paciente
              </Link>
            </p>

            <div className="mt-8 rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <p className="font-medium text-slate-600 dark:text-slate-300">Usuarios de prueba</p>
              <p className="mt-1 font-mono">paciente@syssalud.com · asistente@syssalud.com</p>
              <p className="font-mono">profesional@syssalud.com · dueno@syssalud.com</p>
              <p className="mt-1">
                Contraseña: <span className="font-mono">Syssalud2026!</span> (correr{' '}
                <span className="font-mono">npm run seed</span> primero)
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
