import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Performance.css';

export default function Performance() {
  const navigate = useNavigate();

  // Filtros de período (Entrada E del CUU08)
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');

  // Datos simulados del profesional de estética (Salidas S del CUU08)
  const doctorMetrics = {
    doctorName: 'Dra. Valeria Rossi',
    specialty: 'Dermatología Estética & Medicina Antiage',
    totalTreatments: 142,
    conversionRate: '78%', // Pacientes que realizaron tratamiento tras la valoración
    patientSatisfaction: '4.9 / 5.0 ⭐',
    totalHoursConsulted: 110,

    // Tratamientos estéticos realizados por el profesional
    treatmentBreakdown: [
      { name: 'Aplicación de Toxina Botulínica (Botox)', sessions: 48, rating: '4.9' },
      { name: 'Relleno con Ácido Hialurónico', sessions: 35, rating: '5.0' },
      { name: 'Peeling Químico Médico', sessions: 28, rating: '4.8' },
      { name: 'Consulta de Valoración Facial/Corporal', sessions: 31, rating: '4.9' },
    ],

    // Desempeño mensual comparativo
    monthlyComparison: [
      { month: 'Junio 2026', treatments: 118, satisfaction: '4.8' },
      { month: 'Julio 2026', treatments: 130, satisfaction: '4.9' },
      { month: 'Agosto 2026 (Actual)', treatments: 142, satisfaction: '4.9' },
    ]
  };

  return (
    <div className="perf-container">
      {/* Encabezado */}
      <header className="perf-header">
        <div>
          <button onClick={() => navigate('/doctor/menu')} className="btn-back">
            ← Volver al Panel Médico
          </button>
          <h1>SysSalud Estética - Desempeño Profesional</h1>
          <p className="subtitle">{doctorMetrics.doctorName} | {doctorMetrics.specialty}</p>
        </div>
        <button onClick={() => window.print()} className="btn-export">
          🖨️ Exportar Mi Reporte
        </button>
      </header>

      {/* Filtro por Fecha (Entradas de CUU08) */}
      <section className="filter-card">
        <h3>Filtrar Período de Desempeño</h3>
        <div className="filter-grid">
          <div>
            <label>Seleccionar Período:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes (Agosto 2026)</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Año 2026</option>
            </select>
          </div>

          <div>
            <label>Desde:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          <div>
            <label>Hasta:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          <div className="filter-btn-container">
            <button className="btn-apply">Filtrar Métricas</button>
          </div>
        </div>
      </section>

      {/* KPIs clave para Estética */}
      <section className="kpi-grid">
        <div className="kpi-card highlight">
          <span className="kpi-title">Tratamientos Realizados</span>
          <span className="kpi-value">{doctorMetrics.totalTreatments}</span>
          <span className="kpi-trend positive">+9.2% vs. mes anterior</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Efectividad Valoración → Tratamiento</span>
          <span className="kpi-value">{doctorMetrics.conversionRate}</span>
          <span className="kpi-sub">Conversión de consultas iniciales</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Satisfacción del Paciente</span>
          <span className="kpi-value">{doctorMetrics.patientSatisfaction}</span>
          <span className="kpi-trend positive">Excelente calificación</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Horas de Gabinete / Consultorio</span>
          <span className="kpi-value">{doctorMetrics.totalHoursConsulted} hs</span>
          <span className="kpi-sub">Tiempo efectivo de atención</span>
        </div>
      </section>

      {/* Desglose por Tratamientos Estéticos */}
      <div className="tables-grid">
        <div className="table-card">
          <h3>Procedimientos Estéticos Realizados</h3>
          <table className="perf-table">
            <thead>
              <tr>
                <th>Tratamiento / Procedimiento</th>
                <th>Sesiones</th>
                <th>Calificación Pacientes</th>
              </tr>
            </thead>
            <tbody>
              {doctorMetrics.treatmentBreakdown.map((item, index) => (
                <tr key={index}>
                  <td className="font-medium">{item.name}</td>
                  <td className="font-semibold">{item.sessions}</td>
                  <td>⭐ {item.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Evolución Mensual del Profesional */}
        <div className="table-card">
          <h3>Evolución de Atenciones</h3>
          <table className="perf-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Procedimientos Totales</th>
                <th>Satisfacción Promedio</th>
              </tr>
            </thead>
            <tbody>
              {doctorMetrics.monthlyComparison.map((row, index) => (
                <tr key={index}>
                  <td className="font-medium">{row.month}</td>
                  <td className="font-semibold">{row.treatments}</td>
                  <td>⭐ {row.satisfaction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}