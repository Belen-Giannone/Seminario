import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { claseBoton } from '../components/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center transition-theme dark:bg-slate-950">
      <Brand />
      <p className="mt-6 font-mono text-5xl font-semibold text-teal-600 dark:text-teal-400">404</p>
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Página no encontrada</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          La dirección que ingresaste no existe o fue movida.
        </p>
      </div>
      <Link to="/" className={`${claseBoton('secundario')} mt-2`}>
        Volver al inicio
      </Link>
    </div>
  );
}
