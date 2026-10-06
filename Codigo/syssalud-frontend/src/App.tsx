import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './lib/auth-context';
import { ThemeProvider } from './lib/theme-context';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { CatalogoServicios } from './pages/services/CatalogoServicios';
import { ServicioForm } from './pages/services/ServicioForm';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
            <Route
              path="/staff/servicios"
              element={
                <ProtectedRoute>
                  <CatalogoServicios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/servicios/nuevo"
              element={
                <ProtectedRoute>
                  <ServicioForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/servicios/:id/editar"
              element={
                <ProtectedRoute>
                  <ServicioForm />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
