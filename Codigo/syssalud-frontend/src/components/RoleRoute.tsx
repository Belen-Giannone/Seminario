import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Rol } from '@syssalud/shared-types';
import { useAuth } from '../lib/auth-context';

/** Restringe una ruta ya protegida (`ProtectedRoute`) a determinados roles (RN01). */
export function RoleRoute({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario } = useAuth();
  if (!usuario) return null;
  if (!roles.includes(usuario.rol)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
