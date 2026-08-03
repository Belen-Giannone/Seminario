import React from 'react';
import { useNavigate } from 'react-router-dom';
import './OwnerMenu.css';

export default function OwnerMenu() {
  const navigate = useNavigate();

  // Datos del dueño simulados
  const ownerData = {
    name: 'Dr. Roberto Fernández',
    role: 'Director General / Dueño',
    center: 'SysSalud Centro Médico',
  };

  return (
    <div className="owner-menu-container">
      {/* Encabezado */}
      <header className="owner-header">
        <div className="owner-info">
          <h1>Panel de Dirección</h1>
          <div className="owner-details">
            <span className="owner-name">{ownerData.name}</span>
            <span className="owner-meta">{ownerData.role} | {ownerData.center}</span>
          </div>
        </div>
        <button onClick={() => navigate('/login')} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      <main className="owner-grid">
        {/* Opción 1: Métricas del Negocio (CUU07) */}
        <div 
          className="owner-card" 
          onClick={() => navigate('/owner/metrics')}
        >
          <div className="card-icon">📈</div>
          <h2>Métricas del Negocio</h2>
          <p>Visualiza el dashboard general: nivel de ocupación, reporte de ingresos, servicios más demandados e indicadores clave (KPIs).</p>
        </div>

        {/* Opción 2: Gestión Global de Servicios y Tarifas */}
        <div 
          className="owner-card" 
          onClick={() => navigate('/admin/services')}
        >
          <div className="card-icon">🏥</div>
          <h2>Catálogo de Servicios y Costos</h2>
          <p>Supervisa los valores de las prestaciones, vigencia de tarifas y la oferta de servicios del centro médico.</p>
        </div>
      </main>
    </div>
  );
}