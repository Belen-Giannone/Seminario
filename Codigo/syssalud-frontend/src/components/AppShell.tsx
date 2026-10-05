import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { Rol } from '@syssalud/shared-types';
import { useAuth } from '../lib/auth-context';
import { ETIQUETA_ROL } from '../lib/roles';
import { Brand } from './Brand';
import { Button } from './Button';
import { ThemeToggle } from './ThemeToggle';

interface AppShellProps {
  children: ReactNode;
  /** Si se indica, otros roles son redirigidos al panel. */
  roles?: Rol[];
  /** Oculta el link "Volver al panel" (para el propio panel). */
  esPanel?: boolean;
}

/** Layout común de las pantallas internas: header con marca, usuario y acciones. */
export function AppShell({ children, roles, esPanel = false }: AppShellProps) {
  const { usuario, logout } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/dashboard" replace />;

  const iniciales = `${usuario.nombre[0] ?? ''}${usuario.apellido[0] ?? ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur transition-theme dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              <Brand />
            </Link>
            {!esPanel && (
              <Link
                to="/dashboard"
                className="hidden text-sm text-slate-500 transition-theme hover:text-slate-900 sm:inline dark:text-slate-400 dark:hover:text-slate-50"
              >
                ← Volver al panel
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {iniciales}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ETIQUETA_ROL[usuario.rol]}</p>
              </div>
            </div>
            <ThemeToggle />
            <Button variante="secundario" tamano="sm" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

interface PageHeaderProps {
  /** Etiqueta chica arriba del título (ej. "CUU01"). */
  eyebrow?: string;
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}

export function PageHeader({ eyebrow, titulo, descripcion, acciones }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="font-mono text-xs font-medium uppercase tracking-wide text-teal-600 dark:text-teal-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 gap-2">{acciones}</div>}
    </div>
  );
}

/** Tarjeta contenedora con el estilo común. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white transition-theme dark:border-slate-800 dark:bg-slate-900 ${className ?? ''}`}
    >
      {children}
    </section>
  );
}
