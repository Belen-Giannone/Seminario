import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessMetrics.css';

export default function BusinessMetrics() {
  const navigate = useNavigate();

  // Filtros de fecha (Entradas E de CUU07)
  const [period, setPeriod] = useState('month');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-08-31');

  // Datos simulados (Salidas S de CUU07)
  const metricsData = {
    totalRevenue: '$ 3.450.000',
    totalAppointments: 420,
    completedAppointments: 385,
    cancellationRate: '8.3%',
    occupancyRate: '89%',
    
    // Servicios más demandados
    topServices: [
      { name: 'Aplicación de Botox', count: 180, revenue: '$ 1.080.000' },
      { name: 'Implantes mamarios', count: 95, revenue: '$ 1.140.000' },
      { name: 'Rinoplastía', count: 65, revenue: '$ 670.000' },
    ],

    // Desempeño por especialidad
    specialtyStats: [
      { specialty: 'Cosmetología', appointments: 210, revenue: '$ 1.260.000' },
      { specialty: 'Dermatología', appointments: 120, revenue: '$ 1.320.000' },
      { specialty: 'Cirugía Plástica', appointments: 90, revenue: '$ 870.000' },
    ]
  };

  return (
    <div className="metrics-container">
      {/* Barra superior con navegación */}
      <header className="metrics-header">
        <div>
          <button onClick={() => navigate('/owner/menu')} className="btn-back">
            ← Volver al Menú
          </button>
          <h1>SysSalud - Métricas del Negocio</h1>
        </div>
        <button onClick={() => window.print()} className="btn-export">
          🖨️ Exportar Reporte
        </button>
      </header>

      {/* Filtros de Período (CUU07 Entrada) */}
      <section className="filter-card">
        <h3>Filtrar Período de Análisis</h3>
        <div className="filter-grid">
          <div>
            <label>Período Rápido:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes (Agosto 2026)</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Año (2026)</option>
            </select>
          </div>

          <div>
            <label>Fecha Desde:</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>

          <div>
            <label>Fecha Hasta:</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>

          <div className="filter-btn-container">
            <button className="btn-apply">Aplicar Filtros</button>
          </div>
        </div>
      </section>

      {/* Tarjetas de KPIs principales */}
      <section className="kpi-grid">
        <div className="kpi-card highlight">
          <span className="kpi-title">Ingresos Totales</span>
          <span className="kpi-value">{metricsData.totalRevenue}</span>
          <span className="kpi-trend positive">+12% vs. mes anterior</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Turnos Atendidos</span>
          <span className="kpi-value">{metricsData.completedAppointments}</span>
          <span className="kpi-sub">de {metricsData.totalAppointments} reservados</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Tasa de Ocupación</span>
          <span className="kpi-value">{metricsData.occupancyRate}</span>
          <span className="kpi-trend positive">Capacidad óptima</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Tasa de Cancelación</span>
          <span className="kpi-value">{metricsData.cancellationRate}</span>
          <span className="kpi-trend negative">-1.5% vs. mes anterior</span>
        </div>
      </section>

      {/* Tablas de Detalle / Gráficos */}
      <div className="tables-grid">
        {/* Servicios más demandados */}
        <div className="table-card">
          <h3>Servicios Más Demandados</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Turnos</th>
                <th>Recaudación</th>
              </tr>
            </thead>
            <tbody>
              {metricsData.topServices.map((srv, index) => (
                <tr key={index}>
                  <td className="font-medium">{srv.name}</td>
                  <td>{srv.count}</td>
                  <td className="font-semibold text-green">{srv.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rendimiento por Especialidad */}
        <div className="table-card">
          <h3>Rendimiento por Especialidad</h3>
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Especialidad</th>
                <th>Consultas</th>
                <th>Ingresos Generados</th>
              </tr>
            </thead>
            <tbody>
              {metricsData.specialtyStats.map((spec, index) => (
                <tr key={index}>
                  <td className="font-medium">{spec.specialty}</td>
                  <td>{spec.appointments}</td>
                  <td className="font-semibold text-green">{spec.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}