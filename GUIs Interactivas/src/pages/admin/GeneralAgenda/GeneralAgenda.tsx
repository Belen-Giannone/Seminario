import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './GeneralAgenda.css';

interface Shift {
  id: number;
  time: string;
  patientName: string;
  dni: string;
  doctorName: string;
  service: string;
  status: 'Confirmado' | 'En Espera' | 'Atendido' | 'Cancelado';
}

export default function GeneralAgenda() {
  const navigate = useNavigate();

  // Estados de Filtro
  const [selectedDate, setSelectedDate] = useState('2026-08-03');
  const [selectedDoctor, setSelectedDoctor] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Datos simulados de turnos del día para la clínica
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: 1,
      time: '09:00',
      patientName: 'María Rossi',
      dni: '38.452.109',
      doctorName: 'Dra. Valeria Rossi',
      service: 'Aplicación Toxina Botulínica',
      status: 'Atendido',
    },
    {
      id: 2,
      time: '09:30',
      patientName: 'Gonzalo Pérez',
      dni: '36.111.405',
      doctorName: 'Dr. Alejandro Gomez',
      service: 'Consulta Valoración Facial',
      status: 'En Espera',
    },
    {
      id: 3,
      time: '10:00',
      patientName: 'Lucía Fernández',
      dni: '40.123.882',
      doctorName: 'Dra. Valeria Rossi',
      service: 'Relleno Ácido Hialurónico',
      status: 'Confirmado',
    },
    {
      id: 4,
      time: '11:00',
      patientName: 'Carlos Gómez',
      dni: '35.981.200',
      doctorName: 'Dra. Valeria Rossi',
      service: 'Peeling Químico',
      status: 'Confirmado',
    },
    {
      id: 5,
      time: '11:30',
      patientName: 'Ana Clara Silva',
      dni: '39.882.110',
      doctorName: 'Dr. Alejandro Gomez',
      service: 'Perfilado de Labios',
      status: 'Cancelado',
    },
  ]);

  // Cancelar turno (Simulación)
  const handleCancelShift = (id: number) => {
    if (window.confirm('¿Está seguro de que desea cancelar este turno?')) {
      setShifts(
        shifts.map((s) => (s.id === id ? { ...s, status: 'Cancelado' } : s))
      );
    }
  };

  // Filtrado dinámico
  const filteredShifts = shifts.filter((s) => {
    const matchDoctor = selectedDoctor === 'Todos' || s.doctorName === selectedDoctor;
    const matchStatus = selectedStatus === 'Todos' || s.status === selectedStatus;
    return matchDoctor && matchStatus;
  });

  return (
    <div className="general-agenda-container">
      {/* Encabezado */}
      <header className="agenda-header">
        <div>
          <button onClick={() => navigate('/admin/menu')} className="btn-back">
            ← Volver al Panel Administrativo
          </button>
          <h1>Gestión de Agenda General</h1>
          <p className="subtitle">Administración de citas y recepción de pacientes</p>
        </div>
        <button 
          onClick={() => navigate('/patient/book-appointment')} 
          className="btn-new-appointment"
        >
          ➕ Agendar Nuevo Turno
        </button>
      </header>

      {/* Bar de Controles y Filtros */}
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
          <label>Profesional:</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="Todos">Todos los profesionales</option>
            <option value="Dra. Valeria Rossi">Dra. Valeria Rossi</option>
            <option value="Dr. Alejandro Gomez">Dr. Alejandro Gomez</option>
          </select>
        </div>

        <div className="control-group">
          <label>Estado:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="En Espera">En Espera</option>
            <option value="Confirmado">Confirmado</option>
            <option value="Atendido">Atendido</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>

        <div className="agenda-summary">
          <span>Turnos mostrados: <strong>{filteredShifts.length}</strong></span>
        </div>
      </section>

      {/* Tabla de Agenda General */}
      <section className="agenda-card">
        <table className="agenda-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Paciente</th>
              <th>DNI</th>
              <th>Profesional</th>
              <th>Tratamiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredShifts.map((shift) => (
              <tr key={shift.id}>
                <td className="font-semibold text-sky">{shift.time} hs</td>
                <td className="font-medium">{shift.patientName}</td>
                <td>{shift.dni}</td>
                <td>{shift.doctorName}</td>
                <td>{shift.service}</td>
                <td>
                  <span className={`badge badge-${shift.status.toLowerCase().replace(' ', '-')}`}>
                    {shift.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {shift.status !== 'Cancelado' && (
                      <button
                        onClick={() => handleCancelShift(shift.id)}
                        className="btn-action danger"
                        title="Cancelar Turno"
                      >
                        ❌ Cancelar
                      </button>
                    )}
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