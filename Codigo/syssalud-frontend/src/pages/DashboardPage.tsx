import { Rol } from '@syssalud/shared-types';
import { Brand } from '../components/Brand';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth-context';

const ETIQUETA_ROL: Record<Rol, string> = {
  [Rol.PACIENTE]: 'Paciente',
  [Rol.ASISTENTE]: 'Asistente administrativo',
  [Rol.PROFESIONAL]: 'Profesional médico',
  [Rol.DUENO]: 'Dueño del centro',
};

interface ModuloCard {
  nombre: string;
  descripcion: string;
  cuu: string;
  roles: Rol[];
}

const MODULOS: ModuloCard[] = [
  { nombre: 'Turnos', descripcion: 'Solicitar, cancelar y reprogramar turnos.', cuu: 'CUU02–04', roles: [Rol.PACIENTE, Rol.ASISTENTE] },
  { nombre: 'Agenda', descripcion: 'Consultar la agenda de turnos asignados.', cuu: 'CUU05', roles: [Rol.PROFESIONAL, Rol.ASISTENTE] },
  { nombre: 'Pagos', descripcion: 'Comprobantes y estado de pago de tus turnos.', cuu: 'CUU06', roles: [Rol.PACIENTE, Rol.ASISTENTE] },
  { nombre: 'Pacientes', descripcion: 'Registrar y buscar pacientes del centro.', cuu: 'CUU01', roles: [Rol.ASISTENTE] },
  { nombre: 'Historia clínica', descripcion: 'Consultas, observaciones y antecedentes.', cuu: 'CUU09', roles: [Rol.PROFESIONAL] },
  { nombre: 'Servicios', descripcion: 'Catálogo de servicios del centro.', cuu: 'CUU10', roles: [Rol.ASISTENTE] },
  { nombre: 'Profesionales', descripcion: 'Alta y horarios de atención.', cuu: '—', roles: [Rol.ASISTENTE] },
  { nombre: 'Métricas del negocio', descripcion: 'Ingresos, ocupación y desempeño del centro.', cuu: 'CUU07', roles: [Rol.DUENO] },
  { nombre: 'Métricas de desempeño', descripcion: 'Tu actividad: turnos, pacientes y horas.', cuu: 'CUU08', roles: [Rol.PROFESIONAL] },
];

export function DashboardPage() {
  const { usuario, logout } = useAuth();
  if (!usuario) return null;

  const modulosVisibles = MODULOS.filter((m) => m.roles.includes(usuario.rol));

  return (
    <div className="min-h-screen bg-slate-50 transition-theme dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur transition-theme dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-theme hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 transition-theme sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Hola,</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {usuario.nombre} {usuario.apellido}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{usuario.email}</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-teal-50 px-3 py-1 font-mono text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            {ETIQUETA_ROL[usuario.rol]}
          </span>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tus módulos</h2>
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
              {modulosVisibles.length} disponibles para tu rol
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulosVisibles.map((modulo) => (
              <div
                key={modulo.nombre}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 opacity-80 transition-theme dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900 dark:text-slate-50">{modulo.nombre}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Próximamente
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{modulo.descripcion}</p>
                </div>
                <p className="mt-4 font-mono text-xs text-slate-400 dark:text-slate-600">{modulo.cuu}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
