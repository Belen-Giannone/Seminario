import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DoctorAgenda.css';

interface Shift {
  id: number;
  time: string;
  patientName: string;
  dni: string;
  service: string;
  status: 'Atendido' | 'En Espera' | 'Confirmado' | 'Cancelado';
}

export default function DoctorAgenda() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('2026-08-03');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Turnos simulados del día
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: 1,
      time: '09:00',
      patientName: 'María Rossi',
      dni: '38.452.109',
      service: 'Aplicación Toxina Botulínica',
      status: 'Atendido',
    },
    {
      id: 2,
      time: '10:00',
      patientName: 'Lucía Fernández',
      dni: '40.123.882',
      service: 'Relleno Ácido Hialurónico',
      status: 'En Espera',
    },
    {
      id: 3,
      time: '11:00',
      patientName: 'Carlos Gómez',
      dni: '35.981.200',
      service: 'Peeling Químico',
      status: 'Confirmado',
    },
    {
      id: 4,
      time: '12:00',
      patientName: 'Sofia Martínez',
      dni: '42.001.334',
      service: 'Consulta Valoración Facial',
      status: 'Confirmado',
    },
  ]);

  const filteredShifts = shifts.filter((s) => {
    if (filterStatus === 'Todos') return true;
    return s.status === filterStatus;
  });

  return (
    <div className="agenda-container">
      {/* Encabezado */}
      <header className="agenda-header">
        <div>
          <button onClick={() => navigate('/doctor/menu')} className="btn-back">
            ← Volver al Panel Médico
          </button>
          <h1>Agenda de Consultas y Tratamientos</h1>
          <p className="subtitle">Dra. Valeria Rossi | M.P. 34892</p>
        </div>
      </header>

      {/* Bar de Controles / Filtros */}
      <section className="agenda-controls">
        <div className="control-group">
          <label>Fecha:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>Estado del Turno:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="En Espera">En Espera</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Atendido">Atendido</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div className="agenda-summary">
          <span>Total Pacientes: <strong>{filteredShifts.length}</strong></span>
        </div>
      </section>

      {/* Lista / Tabla de Turnos */}
      <section className="agenda-card">
        <table className="agenda-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Paciente</th>
              <th>DNI</th>
              <th>Tratamiento / Servicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map((shift) => (
              <tr key={shift.id}>
                <td className="font-semibold text-blue">{shift.time} hs</td>
                <td className="font-medium">{shift.patientName}</td>
                <td>{shift.dni}</td>
                <td>{shift.service}</td>
                <td>
                  <span className={`badge badge-${shift.status.toLowerCase().replace(' ', '-')}`}>
                    {shift.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => navigate(`/doctor/medical-record?dni=${shift.dni}`)}
                      className="btn-action primary"
                    >
                      📂 Historia Clínica
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}