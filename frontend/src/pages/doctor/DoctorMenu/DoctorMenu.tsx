import React from 'react';
import { useNavigate } from 'react-router-dom';
import './DoctorMenu.css';

export default function DoctorMenu() {
  const navigate = useNavigate();

  // Datos del médico simulados (<datos prof> en el bosquejo)
  const doctorData = {
    name: 'Dr. Alejandro Gomez',
    specialty: 'Dermatología',
    license: 'M.P. 34892',
  };

  return (
    <div className="doctor-menu-container">
      {/* Encabezado con <datos prof> según el bosquejo */}
      <header className="doctor-header">
        <div className="prof-info">
          <h1>Panel Médico</h1>
          <div className="prof-details">
            <span className="prof-name">{doctorData.name}</span>
            <span className="prof-meta">{doctorData.specialty} | {doctorData.license}</span>
          </div>
        </div>
        <button onClick={() => navigate('/login')} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      <main className="doctor-grid">
        {/* Opción 1: Gestionar Agenda */}
        <div 
          className="doctor-card" 
          onClick={() => navigate('/doctor/agenda')}
        >
          <div className="card-icon">🩺</div>
          <h2>Gestionar Agenda</h2>
          <p>Revisa la lista de turnos programados, horarios y detalles del paciente para las consultas.</p>
        </div>

        {/* Opción 2: Gestionar Historia Clínica (CUU09) */}
        <div 
          className="doctor-card" 
          onClick={() => navigate('/doctor/medical-record')}
        >
          <div className="card-icon">📂</div>
          <h2>Gestionar Historia Clínica</h2>
          <p>Busca pacientes por DNI o Nombre, consulta antecedentes y registra la evolución médica actual.</p>
        </div>

        {/* Opción 3: Consultar Métricas (CUU08) */}
        <div 
          className="doctor-card" 
          onClick={() => navigate('/doctor/performance')}
        >
          <div className="card-icon">📊</div>
          <h2>Consultar Métricas</h2>
          <p>Revisa el dashboard de rendimiento laboral, total de atenciones realizadas y estadísticas de consulta.</p>
        </div>
      </main>
    </div>
  );
}