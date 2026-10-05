import { Rol } from '@syssalud/shared-types';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../lib/auth-context';

interface ModuloCard {
  nombre: string;
  descripcion: string;
  cuu: string;
  roles: Rol[];
  /** Ruta del módulo; sin ruta la tarjeta no se muestra todavía. */
  ruta?: string;
}

const MODULOS: ModuloCard[] = [
  { nombre: 'Turnos', descripcion: 'Solicitar, cancelar y reprogramar turnos.', cuu: 'CUU02–04', roles: [Rol.PACIENTE, Rol.ASISTENTE] },
  { nombre: 'Agenda', descripcion: 'Consultar la agenda de turnos asignados.', cuu: 'CUU05', roles: [Rol.PROFESIONAL, Rol.ASISTENTE] },
  { nombre: 'Pagos', descripcion: 'Comprobantes y estado de pago de tus turnos.', cuu: 'CUU06', roles: [Rol.PACIENTE, Rol.ASISTENTE] },
  { nombre: 'Pacientes', descripcion: 'Registrar y buscar pacientes del centro.', cuu: 'CUU01', roles: [Rol.ASISTENTE], ruta: '/pacientes' },
  { nombre: 'Historia clínica', descripcion: 'Consultas, observaciones y antecedentes.', cuu: 'CUU09', roles: [Rol.PROFESIONAL], ruta: '/historia-clinica' },
  { nombre: 'Servicios', descripcion: 'Catálogo de servicios del centro.', cuu: 'CUU10', roles: [Rol.ASISTENTE] },
  { nombre: 'Profesionales', descripcion: 'Alta y horarios de atención.', cuu: '—', roles: [Rol.ASISTENTE] },
  { nombre: 'Métricas del negocio', descripcion: 'Ingresos, ocupación y desempeño del centro.', cuu: 'CUU07', roles: [Rol.DUENO] },
  { nombre: 'Métricas de desempeño', descripcion: 'Tu actividad: turnos, pacientes y horas.', cuu: 'CUU08', roles: [Rol.PROFESIONAL] },
];

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buen día';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function DashboardPage() {
  return (
    <AppShell esPanel>
      <Panel />
    </AppShell>
  );
}

function Panel() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  // Sólo los módulos del rol que ya tienen pantalla; el resto aparece al desarrollarse.
  const modulosVisibles = MODULOS.filter(
    (m): m is ModuloCard & { ruta: string } => !!m.ruta && m.roles.includes(usuario.rol),
  );

  return (
    <>
      <p className="text-sm text-slate-500 dark:text-slate-400">{saludo()},</p>
      <h1 className="mt-0.5 text-2xl font-semibold text-slate-900 dark:text-slate-50">{usuario.nombre}</h1>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tus módulos
          </h2>
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
            {modulosVisibles.length} disponibles
          </span>
        </div>

        {modulosVisibles.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Todavía no hay módulos disponibles para tu rol.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulosVisibles.map((modulo) => (
              <Link
                key={modulo.nombre}
                to={modulo.ruta}
                className="group flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 transition-theme hover:border-teal-500 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900 dark:text-slate-50">{modulo.nombre}</h3>
                    <span
                      aria-hidden
                      className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                    >
                      →
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{modulo.descripcion}</p>
                </div>
                <p className="mt-4 font-mono text-xs text-slate-400 dark:text-slate-500">{modulo.cuu}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
