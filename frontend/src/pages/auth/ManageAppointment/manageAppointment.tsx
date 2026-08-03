import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ManageAppointment.css'

interface TurnoVigente {
  id: string
  serviceName: string
  doctorName: string
  date: string
  time: string
  status: string
  canCancel: boolean // Valida precondición del plazo para cancelación
}

const MOCK_TURNOS: TurnoVigente[] = [
  {
    id: 'TUR-101',
    serviceName: 'Cardiología',
    doctorName: 'Dr. Carlos Rossi',
    date: '2026-08-15',
    time: '10:30',
    status: 'CONFIRMADO',
    canCancel: true,
  },
  {
    id: 'TUR-102',
    serviceName: 'Medicina General',
    doctorName: 'Dra. María Fernández',
    date: '2026-08-04',
    time: '09:00',
    status: 'CONFIRMADO',
    canCancel: false, // Fuera de plazo
  },
]

const MOCK_NUEVOS_HORARIOS = ['09:00', '11:15', '15:30', '17:00']

export default function ManageAppointment() {
  const navigate = useNavigate()

  // Modo Asistente Administrativo (ADM)
  const [isAdminRole, setIsAdminRole] = useState(false)
  const [searchDni, setSearchDni] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<{ dni: string; name: string } | null>(null)

  // Estados principales de la vista
  const [selectedTurno, setSelectedTurno] = useState<TurnoVigente | null>(null)
  const [action, setAction] = useState<'reprogram' | 'cancel' | null>(null)
  
  // Estado del flujo / Pantalla
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Selección, 2: Configuración (Acción), 3: Éxito
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Estados específicos para REPROGRAMAR (CUU04)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [noSlotsAvailable, setNoSlotsAvailable] = useState(false)

  // Estados específicos para CANCELAR (CUU03)
  const [cancelReason, setCancelReason] = useState('')

  // Búsqueda de Paciente (ADM)
  const handleSearchPatient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchDni.trim()) return
    setSelectedPatient({ dni: searchDni, name: 'María González (Paciente)' })
    setErrorMessage(null)
  }

  // Seleccionar Turno
  const handleSelectTurno = (turno: TurnoVigente) => {
    setSelectedTurno(turno)
    setAction(null)
    setErrorMessage(null)
  }

  // Selección de Acción (Reprogramar o Cancelar)
  const handleActionSelect = (selectedAction: 'reprogram' | 'cancel') => {
    if (!selectedTurno) return

    // Si elige cancelar y está fuera del plazo permitido (CUU03 - 2.a)
    if (selectedAction === 'cancel' && !selectedTurno.canCancel) {
      setErrorMessage('El turno seleccionado se encuentra fuera del plazo mínimo permitido para cancelación.')
      return
    }

    setErrorMessage(null)
    setAction(selectedAction)
    setStep(2)
  }

  // Cambio de fecha en Reprogramar
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value
    setNewDate(dateValue)
    setNewTime('')

    // Simulación: Sin disponibilidad en domingos (CUU04 - 2.a)
    const dayOfWeek = new Date(dateValue).getDay()
    if (dayOfWeek === 6) {
      setNoSlotsAvailable(true)
    } else {
      setNoSlotsAvailable(false)
    }
  }

  // Confirmar Acción
  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(3)
  }

  return (
    <main className="manage-page">
      <section className="manage-panel">
        <div className="manage-header">
          <div className="manage-top-bar">
            <span className="manage-badge">SysSalud</span>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={isAdminRole}
                onChange={(e) => {
                  setIsAdminRole(e.target.checked)
                  setSelectedPatient(null)
                  setSearchDni('')
                }}
              />
              Modo Administrativo (ADM)
            </label>
          </div>

          <h1>Gestionar Turno</h1>
          <p>Selecciona tu turno para reprogramarlo o cancelarlo</p>
        </div>

        {/* Buscador ADM */}
        {isAdminRole && (
          <div className="admin-search-box">
            <h3>Buscador de Pacientes</h3>
            <p className="admin-instruction">Ingrese el DNI para gestionar turnos del paciente.</p>
            <form onSubmit={handleSearchPatient} className="admin-search-form">
              <input
                type="text"
                placeholder="Ingrese DNI"
                value={searchDni}
                onChange={(e) => setSearchDni(e.target.value)}
                required
              />
              <button type="submit" className="secondary-button">Buscar</button>
            </form>
            {selectedPatient && (
              <div className="patient-selected-card">
                ✅ Paciente: <strong>{selectedPatient.name}</strong> (DNI: {selectedPatient.dni})
              </div>
            )}
          </div>
        )}

        {/* Mensajes de Error */}
        {errorMessage && (
          <div className="error-alert">
            <p>⚠️ {errorMessage}</p>
          </div>
        )}

        {/* PASO 1: Selección de Turno y Acción */}
        {step === 1 && (
          <div className="step-container">
            <h2>1. Selecciona un Turno Vigente</h2>

            {isAdminRole && !selectedPatient ? (
              <p className="info-message">Busca un paciente para continuar.</p>
            ) : (
              <div className="turnos-list">
                {MOCK_TURNOS.map((turno) => (
                  <div
                    key={turno.id}
                    className={`turno-card ${selectedTurno?.id === turno.id ? 'selected' : ''}`}
                    onClick={() => handleSelectTurno(turno)}
                  >
                    <div className="turno-card-header">
                      <span className="turno-service">{turno.serviceName}</span>
                      <span className="status-badge valid">{turno.status}</span>
                    </div>
                    <div className="turno-card-body">
                      <p><strong>Médico:</strong> {turno.doctorName}</p>
                      <p><strong>Fecha/Hora:</strong> {turno.date} - {turno.time} hs</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Opciones de Acción tras elegir Turno */}
            {selectedTurno && (
              <div className="action-selection-box margin-top">
                <h3>¿Qué deseas hacer con este turno?</h3>
                <div className="action-buttons-grid">
                  <button
                    type="button"
                    className="action-card reprogram"
                    onClick={() => handleActionSelect('reprogram')}
                  >
                    <span className="action-icon">📅</span>
                    <div>
                      <strong>Reprogramar Turno</strong>
                      <p>Cambiar fecha y/o horario de la cita</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="action-card cancel"
                    onClick={() => handleActionSelect('cancel')}
                  >
                    <span className="action-icon">❌</span>
                    <div>
                      <strong>Cancelar Turno</strong>
                      <p>Anular la cita y gestionar devolución</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PASO 2: Configuración según la Acción Seleccionada */}
        {step === 2 && selectedTurno && (
          <div className="step-container">
            <div className="current-turno-summary">
              <p><strong>Turno Seleccionado:</strong> {selectedTurno.serviceName} con {selectedTurno.doctorName}</p>
              <p className="current-datetime">📅 {selectedTurno.date} a las {selectedTurno.time} hs</p>
            </div>

            {/* OPCIÓN A: FLUTO DE REPROGRAMAR (CUU04) */}
            {action === 'reprogram' && (
              <form onSubmit={handleConfirmAction} className="action-form">
                <h2>Reprogramar Turno</h2>

                <div className="field">
                  <label>Seleccionar Nueva Fecha</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {noSlotsAvailable ? (
                  <div className="no-slots-box margin-top">
                    <p>⚠️ No hay horarios disponibles. ¿Deseas cancelar el turno?</p>
                    <div className="button-group margin-top">
                      <button type="button" className="danger-button" onClick={() => setAction('cancel')}>
                        Cambiar a Cancelar Turno
                      </button>
                      <button type="button" className="secondary-button" onClick={() => setNoSlotsAvailable(false)}>
                        Elegir otra fecha
                      </button>
                    </div>
                  </div>
                ) : (
                  newDate && (
                    <div className="field margin-top">
                      <label>Horarios Disponibles</label>
                      <div className="time-slots-grid">
                        {MOCK_NUEVOS_HORARIOS.map((time) => (
                          <button
                            key={time}
                            type="button"
                            className={`time-slot ${newTime === time ? 'selected' : ''}`}
                            onClick={() => setNewTime(time)}
                          >
                            {time} hs
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}

                {!noSlotsAvailable && (
                  <div className="button-group margin-top">
                    <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                      Volver
                    </button>
                    <button type="submit" className="primary-button" disabled={!newDate || !newTime}>
                      Confirmar Reprogramación
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* OPCIÓN B: FLUJO DE CANCELAR (CUU03) */}
            {action === 'cancel' && (
              <form onSubmit={handleConfirmAction} className="action-form">
                <h2 className="danger-text">Cancelar Turno</h2>

                <div className="field">
                  <label>Motivo de la Cancelación (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej: Motivos personales, superposición de horarios, etc."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>

                <div className="refund-warning-box">
                  <p>
                    ℹ️ <strong>Devolución:</strong> Una vez confirmada la cancelación, el reintegro del dinero será gestionado manualmente por el Asistente Administrativo.
                  </p>
                </div>

                <div className="button-group margin-top">
                  <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                    Volver
                  </button>
                  <button type="submit" className="danger-button">
                    Confirmar Cancelación
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* PASO 3: Confirmación / Resultado Final */}
        {step === 3 && selectedTurno && (
          <div className="step-container success-container">
            <div className={`success-icon ${action === 'cancel' ? 'cancel-icon' : ''}`}>
              ✓
            </div>
            <h2>
              {action === 'reprogram' ? 'Turno Reprogramado' : 'Turno Cancelado. Detalles:'}
            </h2>
            <p className="success-subtitle">
              {action === 'reprogram'
                ? 'Se ha actualizado la reserva en la agenda.'
                : 'El horario ha sido liberado en la agenda del profesional.'}
            </p>

            <div className="receipt-box">
              <div className="receipt-row">
                <span>Estado:</span>
                <span className={action === 'reprogram' ? 'badge-confirmed' : 'badge-cancelled'}>
                  {action === 'reprogram' ? 'REPROGRAMADO' : 'CANCELADO'}
                </span>
              </div>
              <div className="receipt-row">
                <span>Paciente:</span>
                <strong>{isAdminRole ? selectedPatient?.name : 'Paciente Autenticado'}</strong>
              </div>
              <div className="receipt-row">
                <span>Servicio:</span>
                <span>{selectedTurno.serviceName}</span>
              </div>
              <div className="receipt-row">
                <span>Profesional:</span>
                <span>{selectedTurno.doctorName}</span>
              </div>

              {action === 'reprogram' ? (
                <>
                  <div className="receipt-row">
                    <span>Anterior Horario:</span>
                    <span className="text-line-through">{selectedTurno.date} - {selectedTurno.time} hs</span>
                  </div>
                  <div className="receipt-row highlight">
                    <span>Nuevo Horario:</span>
                    <strong>{newDate} - {newTime} hs</strong>
                  </div>
                </>
              ) : (
                <div className="receipt-row">
                  <span>Horario Liberado:</span>
                  <span>{selectedTurno.date} - {selectedTurno.time} hs</span>
                </div>
              )}
            </div>

            {action === 'cancel' && (
              <div className="refund-info-box">
                <p>
                  💸 La devolución del monto abonado se gestionará manualmente por la Asistente Administrativa.
                </p>
              </div>
            )}

            <button type="button" className="primary-button margin-top" onClick={() => navigate('/patient')}>
              Volver al Menú Principal
            </button>
          </div>
        )}
      </section>
    </main>
  )
}