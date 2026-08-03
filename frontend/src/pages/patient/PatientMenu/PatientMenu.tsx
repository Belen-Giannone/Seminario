import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PatientMenu.css';

export default function PatientMenu() {
  const navigate = useNavigate();

  return (
    <div className="menu-container">
      <header className="menu-header">
        <h1>SysSalud - Panel del Paciente</h1>
        <button onClick={() => navigate('/login')} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      <div className="menu-grid">
        {/* Opción 1: Agendar Turno */}
        <div className="menu-card" onClick={() => navigate('/patient/book-appointment')}>
          <div className="card-icon">📅</div>
          <h2>Solicitar Turno</h2>
          <p>Selecciona servicio, profesional, fecha y realiza el pago de la reserva.</p>
        </div>

        {/* Opción 2: Mis Turnos */}
        <div className="menu-card" onClick={() => navigate('/patient/my-appointments')}>
          <div className="card-icon">📋</div>
          <h2>Gestionar mis Turnos</h2>
          <p>Consulta tus turnos vigentes, reprograma o cancela tus citas.</p>
        </div>
      </div>
    </div>
  );
}