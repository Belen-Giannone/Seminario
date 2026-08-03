import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BookAppointment.css';

export default function BookAppointment() {
  const navigate = useNavigate();

  // Pasos del flujo de agendamiento
  const [step, setStep] = useState(1);

  // Datos del Paciente (Paso 1)
  const [patientDni, setPatientDni] = useState('');
  const [patientFound, setPatientFound] = useState<boolean | null>(null);
  const [patientData, setPatientData] = useState({
    fullName: '',
    phone: '',
    email: '',
  });

  // Selección del Turno (Paso 2)
  const [selectedService, setSelectedService] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-08-05');
  const [selectedTime, setSelectedTime] = useState('');

  // Simulación de búsqueda de paciente por DNI
  const handleSearchPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientDni.trim()) return;

    // Simulación: Si el DNI termina en número par, se encuentra al paciente
    if (patientDni.endsWith('2') || patientDni.endsWith('0') || patientDni.endsWith('4')) {
      setPatientFound(true);
      setPatientData({
        fullName: 'Lucía Fernández',
        phone: '341 555-0192',
        email: 'lucia.fernandez@email.com',
      });
    } else {
      setPatientFound(false);
      setPatientData({ fullName: '', phone: '', email: '' });
    }
  };

  const handleConfirmAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3); // Ir a confirmación final
  };

  return (
    <div className="book-container">
      {/* Encabezado */}
      <header className="book-header">
        <div>
          <button onClick={() => navigate('/admin/agenda')} className="btn-back">
            ← Volver a Agenda General
          </button>
          <h1>Asignación Manual de Turno</h1>
          <p className="subtitle">Módulo de Recepción y Atención Presencial / Telefónica</p>
        </div>
      </header>

      {/* Indicador de Pasos */}
      <div className="steps-indicator">
        <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
          <span>1</span> Identificar Paciente
        </div>
        <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
          <span>2</span> Seleccionar Tratamiento y Horario
        </div>
        <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
          <span>3</span> Confirmación
        </div>
      </div>

      {/* PASO 1: Identificación o Registro del Paciente */}
      {step === 1 && (
        <section className="step-card">
          <h2>1. Identificación del Paciente</h2>

          <form onSubmit={handleSearchPatient} className="search-patient-form">
            <div className="input-group">
              <label>DNI del Paciente:</label>
              <div className="search-row">
                <input
                  type="text"
                  required
                  placeholder="Ingrese DNI (ej: 40123882)"
                  value={patientDni}
                  onChange={(e) => {
                    setPatientDni(e.target.value);
                    setPatientFound(null);
                  }}
                />
                <button type="submit" className="btn-secondary">🔍 Buscar Paciente</button>
              </div>
            </div>
          </form>

          {/* Paciente Encontrado */}
          {patientFound === true && (
            <div className="patient-found-box">
              <div className="status-badge success">✓ Paciente Registrado</div>
              <h3>{patientData.fullName}</h3>
              <p><strong>DNI:</strong> {patientDni} | <strong>Tel:</strong> {patientData.phone}</p>
              <button onClick={() => setStep(2)} className="btn-primary">
                Continuar a Selección de Turno →
              </button>
            </div>
          )}

          {/* Paciente No Encontrado -> Formulario Alta Rápida */}
          {patientFound === false && (
            <div className="new-patient-box">
              <div className="status-badge warning">⚠️ Paciente No Encontrado - Alta Rápida</div>
              <p className="helper-text">Complete los datos básicos para registrarlo e ingresar el turno:</p>

              <div className="form-grid">
                <div>
                  <label>Nombre y Apellido:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sofía Martínez"
                    value={patientData.fullName}
                    onChange={(e) => setPatientData({ ...patientData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label>Teléfono / WhatsApp:</label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 341 555-1234"
                    value={patientData.phone}
                    onChange={(e) => setPatientData({ ...patientData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label>Correo Electrónico:</label>
                  <input
                    type="email"
                    placeholder="ejemplo@email.com"
                    value={patientData.email}
                    onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
                  />
                </div>
              </div>

              <button
                disabled={!patientData.fullName || !patientData.phone}
                onClick={() => setStep(2)}
                className="btn-primary mt-1"
              >
                Registrar y Continuar →
              </button>
            </div>
          )}
        </section>
      )}

      {/* PASO 2: Selección de Servicio, Médico y Fecha */}
      {step === 2 && (
        <section className="step-card">
          <h2>2. Detalles de la Cita</h2>
          <p className="patient-summary">
            Paciente seleccionado: <strong>{patientData.fullName}</strong> ({patientDni || 'Nuevo'})
          </p>

          <form onSubmit={handleConfirmAppointment} className="appointment-form">
            <div className="form-grid">
              <div>
                <label>Tratamiento / Servicio Estético:</label>
                <select
                  required
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  <option value="">-- Seleccionar Tratamiento --</option>
                  <option value="Aplicación Toxina Botulínica">Aplicación Toxina Botulínica</option>
                  <option value="Relleno Ácido Hialurónico">Relleno Ácido Hialurónico</option>
                  <option value="Peeling Químico Médico">Peeling Químico Médico</option>
                  <option value="Consulta Valoración Estética">Consulta Valoración Estética</option>
                </select>
              </div>

              <div>
                <label>Profesional Especialista:</label>
                <select
                  required
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                >
                  <option value="">-- Seleccionar Médico --</option>
                  <option value="Dra. Valeria Rossi">Dra. Valeria Rossi (Dermatología Estética)</option>
                  <option value="Dr. Alejandro Gomez">Dr. Alejandro Gomez (Medicina Antiage)</option>
                </select>
              </div>

              <div>
                <label>Fecha del Turno:</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <label>Horarios Disponibles:</label>
                <div className="time-slots-grid">
                  {['09:00', '10:00', '11:30', '15:00', '16:30'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`time-slot-btn ${selectedTime === time ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time} hs
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="actions-row">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                ← Volver al Paciente
              </button>
              <button
                type="submit"
                disabled={!selectedService || !selectedDoctor || !selectedTime}
                className="btn-primary"
              >
                Confirmar y Reservar Turno →
              </button>
            </div>
          </form>
        </section>
      )}

      {/* PASO 3: Confirmación Final Exitosa */}
      {step === 3 && (
        <section className="step-card success-card">
          <div className="success-icon">🎉</div>
          <h2>¡Turno Agendado Con Éxito!</h2>
          <p className="success-subtitle">Se ha guardado el turno en la agenda de la clínica.</p>

          <div className="confirmation-details">
            <div className="detail-row">
              <span>Paciente:</span>
              <strong>{patientData.fullName}</strong>
            </div>
            <div className="detail-row">
              <span>Tratamiento:</span>
              <strong>{selectedService}</strong>
            </div>
            <div className="detail-row">
              <span>Profesional:</span>
              <strong>{selectedDoctor}</strong>
            </div>
            <div className="detail-row">
              <span>Fecha y Hora:</span>
              <strong>{selectedDate} a las {selectedTime} hs</strong>
            </div>
          </div>

          <div className="actions-row center">
            <button onClick={() => navigate('/admin/agenda')} className="btn-primary">
              📋 Volver a la Agenda General
            </button>
            <button
              onClick={() => {
                setStep(1);
                setPatientDni('');
                setPatientFound(null);
                setSelectedService('');
                setSelectedDoctor('');
                setSelectedTime('');
              }}
              className="btn-secondary"
            >
              ➕ Agendar Otro Turno
            </button>
          </div>
        </section>
      )}
    </div>
  );
}