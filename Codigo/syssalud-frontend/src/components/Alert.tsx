import type { ReactNode } from 'react';

type Tono = 'error' | 'exito' | 'info';

const TONOS: Record<Tono, string> = {
  error:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
  exito:
    'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-300',
  info: 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
};

interface AlertProps {
  tono?: Tono;
  children: ReactNode;
  /** Acción opcional alineada a la derecha (ej. un botón). */
  accion?: ReactNode;
  className?: string;
}

export function Alert({ tono = 'info', children, accion, className }: AlertProps) {
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm ${TONOS[tono]} ${className ?? ''}`}
    >
      <div className="min-w-0">{children}</div>
      {accion}
    </div>
  );
}
