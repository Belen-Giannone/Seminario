import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './MedicalRecord.css';

interface ClinicalNote {
  id: number;
  date: string;
  professional: string;
  procedure: string;
  observations: string;
}

interface Patient {
  dni: string;
  fullName: string;
  age: number;
  phone: string;
  email: string;
  allergies: string;
  notesHistory: ClinicalNote[];
}

export default function MedicalRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDni = searchParams.get('dni') || '';

  const [searchDni, setSearchDni] = useState(initialDni);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    initialDni
      ? {
          dni: '40.123.882',
          fullName: 'Lucía Fernández',
          age: 28,
          phone: '341 555-0192',
          email: 'lucia.fernandez@email.com',
          allergies: 'Sensibilidad a ácido glicólico. Sin alergias medicamentosas conocidas.',
          notesHistory: [
            {
              id: 1,
              date: '15/05/2026',
              professional: 'Dra. Valeria Rossi',
              procedure: 'Peeling Químico Suave',
              observations: 'Se realiza peeling de mandélico al 30%. Toleró bien. Se indican cuidados post-peeling y protector solar 50+.',
            },
          ],
        }
      : null
  );

  // Campos para registrar la nueva evolución médica (CUU09 Entrada)
  const [procedure, setProcedure] = useState('');
  const [observations, setObservations] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulación de búsqueda por DNI (CUU09 Paso 2)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchDni.trim()) return;

    // Simulación de respuesta de búsqueda
    setSelectedPatient({
      dni: searchDni,
      fullName: 'Lucía Fernández',
      age: 28,
      phone: '341 555-0192',
      email: 'lucia.fernandez@email.com',
      allergies: 'Sensibilidad a ácido glicólico. Sin alergias medicamentosas conocidas.',
      notesHistory: [
        {
          id: 1,
          date: '15/05/2026',
          professional: 'Dra. Valeria Rossi',
          procedure: 'Peeling Químico Suave',
          observations: 'Se realiza peeling de mandélico al 30%. Toleró bien. Se indican cuidados post-peeling.',
        },
      ],
    });
    setSaveSuccess(false);
  };

  // Guardar nueva ficha / evolución (CUU09 Paso 3 y Salida)
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !procedure || !observations) return;

    const newNote: ClinicalNote = {
      id: Date.now(),
      date: new Date().toLocaleDateString('es-AR'),
      professional: 'Dra. Valeria Rossi',
      procedure,
      observations,
    };

    setSelectedPatient({
      ...selectedPatient,
      notesHistory: [newNote, ...selectedPatient.notesHistory],
    });

    setProcedure('');
    setObservations('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <div className="record-container">
      {/* Encabezado */}
      <header className="record-header">
        <div>
          <button onClick={() => navigate('/doctor/menu')} className="btn-back">
            ← Volver al Panel Médico
          </button>
          <h1>Gestionar Historia Clínica</h1>
          <p className="subtitle">Dra. Valeria Rossi | M.P. 34892</p>
        </div>
      </header>

      {/* Buscador de Paciente por DNI */}
      <section className="search-card">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <label htmlFor="searchDni">DNI del Paciente:</label>
            <input
              id="searchDni"
              type="text"
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
              placeholder="Ingrese DNI (ej: 40123882)"
            />
          </div>
          <button type="submit" className="btn-search">
            🔍 Buscar Ficha
          </button>
        </form>
      </section>

      {selectedPatient ? (
        <div className="patient-record-grid">
          {/* Ficha e información básica del paciente */}
          <aside className="patient-info-card">
            <h2>Ficha del Paciente</h2>
            <div className="info-group">
              <span className="label">Nombre completo:</span>
              <span className="value font-semibold">{selectedPatient.fullName}</span>
            </div>
            <div className="info-group">
              <span className="label">DNI:</span>
              <span className="value">{selectedPatient.dni}</span>
            </div>
            <div className="info-group">
              <span className="label">Edad:</span>
              <span className="value">{selectedPatient.age} años</span>
            </div>
            <div className="info-group">
              <span className="label">Teléfono:</span>
              <span className="value">{selectedPatient.phone}</span>
            </div>
            <div className="info-group">
              <span className="label">Email:</span>
              <span className="value">{selectedPatient.email}</span>
            </div>

            <div className="allergy-box">
              <span className="allergy-title">⚠️ Antecedentes / Alergias:</span>
              <p>{selectedPatient.allergies}</p>
            </div>
          </aside>

          {/* Registro de nueva observación e Historial */}
          <main className="record-main-content">
            {/* Formulario de Nueva Evolución Médico / Estética */}
            <section className="new-note-card">
              <h3>Registrar Nueva Evolución Clínica</h3>

              {saveSuccess && (
                <div className="alert-success">
                  ✅ Evolución guardada exitosamente en la historia clínica.
                </div>
              )}

              <form onSubmit={handleSaveNote} className="note-form">
                <div>
                  <label>Tratamiento / Procedimiento Realizado:</label>
                  <input
                    type="text"
                    required
                    value={procedure}
                    onChange={(e) => setProcedure(e.target.value)}
                    placeholder="Ej: Aplicación de Toxina Botulínica tercio superior"
                  />
                </div>

                <div>
                  <label>Evolución y Observaciones Médicas:</label>
                  <textarea
                    rows={4}
                    required
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Escriba aquí los detalles del tratamiento, unidades aplicadas, zonas tratadas, productos utilizados e indicaciones..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    💾 Guardar en Historia Clínica
                  </button>
                </div>
              </form>
            </section>

            {/* Historial de Evoluciones Previas */}
            <section className="history-card">
              <h3>Historial de Tratamientos y Consultas</h3>
              {selectedPatient.notesHistory.length === 0 ? (
                <p className="no-records">No hay registros previos para este paciente.</p>
              ) : (
                <div className="history-timeline">
                  {selectedPatient.notesHistory.map((note) => (
                    <div key={note.id} className="history-item">
                      <div className="history-item-header">
                        <span className="note-date">📅 {note.date}</span>
                        <span className="note-prof">{note.professional}</span>
                      </div>
                      <h4 className="note-proc">{note.procedure}</h4>
                      <p className="note-obs">{note.observations}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      ) : (
        <div className="empty-state-card">
          <p>Ingrese un DNI en el buscador para cargar la historia clínica del paciente.</p>
        </div>
      )}
    </div>
  );
}