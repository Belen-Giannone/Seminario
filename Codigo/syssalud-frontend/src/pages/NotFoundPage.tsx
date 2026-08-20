import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center dark:bg-slate-950">
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400">404</p>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Página no encontrada</h1>
      <Link to="/" className="mt-2 text-sm font-medium text-teal-700 hover:underline dark:text-teal-400">
        Volver al inicio
      </Link>
    </div>
  );
}
