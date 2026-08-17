import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminMenu.css';

export default function AdminMenu() {
  const navigate = useNavigate();

  // Datos del asistente en sesión
  const adminData = {
    name: 'Mariana López',
    role: 'Asistente Administrativo',
    shift: 'Turno Mañana',
  };

  return (
    <div className="admin-menu-container">
      {/* Encabezado */}
      <header className="admin-header">
        <div className="admin-info">
          <h1>Panel Administrativo</h1>
          <div className="admin-details">
            <span className="admin-name">{adminData.name}</span>
            <span className="admin-meta">{adminData.role} | {adminData.shift}</span>
          </div>
        </div>
        <button onClick={() => navigate('/login')} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      <main className="admin-grid">
        {/* Opción 1: Gestionar Agenda General */}
        <div 
          className="admin-card" 
          onClick={() => navigate('/admin/agenda')}
        >
          <div className="card-icon">📆</div>
          <h2>Gestionar Agenda</h2>
          <p>Consulta la agenda general de los profesionales, asigna turnos presenciales, cancela o reprograma citas.</p>
        </div>

        {/* Opción 2: Gestión de Pacientes */}
        <div 
          className="admin-card" 
          onClick={() => navigate('/admin/patients')}
        >
          <div className="card-icon">👥</div>
          <h2>Gestión de Pacientes</h2>
          <p>Busca fichas de pacientes por DNI o registra nuevos pacientes en el sistema para habilitar la solicitud de turnos.</p>
        </div>

        {/* Opción 3: Mantener Catálogo de Servicios (CUU10) */}
        <div 
          className="admin-card" 
          onClick={() => navigate('/admin/services')}
        >
          <div className="card-icon">⚙️</div>
          <h2>Catálogo de Servicios</h2>
          <p>Administra los servicios de la clínica: altas, modificaciones de costo/duración y asignación de profesionales.</p>
        </div>
      </main>
    </div>
  );
}