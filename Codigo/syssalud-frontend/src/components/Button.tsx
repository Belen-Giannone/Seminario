import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'fantasma';
type Tamano = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-950';

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-teal-600 text-white shadow-sm hover:bg-teal-700 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400',
  secundario:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  fantasma:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50',
};

const TAMANOS: Record<Tamano, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

/** Clases del botón, para reutilizarlas también en `<Link>`. */
export function claseBoton(variante: Variante = 'primario', tamano: Tamano = 'md'): string {
  return `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamano?: Tamano;
}

export function Button({
  variante = 'primario',
  tamano = 'md',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${claseBoton(variante, tamano)} ${className ?? ''}`} {...rest} />
  );
}
