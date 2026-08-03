import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './BookAppointment.css'

interface Service {
  id: string
  name: string
}

interface Doctor {
  id: string
  name: string
  serviceId: string
}

const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Cardiología' },
  { id: '2', name: 'Medicina General' },
]

const MOCK_DOCTORS: Doctor[] = [
  { id: 'd1', name: 'Dr. Carlos Rossi', serviceId: '1' },
  { id: 'd2', name: 'Dra. María Fernández', serviceId: '2' },
]

const MOCK_TIMES = ['09:00', '10:30', '11:15', '16:00']

export default function BookAppointment() {
  const navigate = useNavigate()

  // Estados del formulario
  const [selectedService, setSelectedService] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | ''>('')
  
  // Simulación de respuesta de pago
  const [simulateFailure, setSimulateFailure] = useState(false)

  // Estados del estado del flujo (1: Formulario, 2: Exitoso, 3: Rechazado)
  const [paymentState, setPaymentState] = useState<'form' | 'success' | 'rejected'>('form')

  const availableDoctors = MOCK_DOCTORS.filter(
    (doc) => doc.serviceId === selectedService
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Si seleccionó tarjeta y activó la simulación de rechazo
    if (paymentMethod === 'tarjeta' && simulateFailure) {
      setPaymentState('rejected')
    } else {
      setPaymentState('success')
    }
  }

  return (
    <main className="book-page">
      <section className="book-panel">
        <div className="book-header">
          <span className="book-badge">SysSalud</span>
          <h1>Solicitar Turno</h1>
          <p>Completa la información para agendar y abonar tu cita médica</p>
        </div>

        {paymentState === 'form' && (
          <form onSubmit={handleSubmit} className="book-form">
            {/* 1. Servicio */}
            <div className="field">
              <label>Especialidad / Servicio</label>
              <select
                required
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value)
                  setSelectedDoctor('')
                }}
              >
                <option value="">-- Seleccionar Servicio --</option>
                {MOCK_SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* 2. Profesional */}
            <div className="field">
              <label>Profesional</label>
              <select
                required
                disabled={!selectedService}
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
              >
                <option value="">-- Seleccionar Profesional --</option>
                {availableDoctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* 3. Fecha y Hora */}
            <div className="grid-2-cols">
              <div className="field">
                <label>Fecha</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Horario</label>
                <select
                  required
                  disabled={!selectedDate}
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                >
                  <option value="">-- Hora --</option>
                  {MOCK_TIMES.map((t) => (
                    <option key={t} value={t}>{t} hs</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Método de Pago */}
            <div className="field margin-top">
              <label>Método de Pago</label>
              <div className="payment-options">
                <label className={`payment-card ${paymentMethod === 'efectivo' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="efectivo"
                    onChange={() => {
                      setPaymentMethod('efectivo')
                      setSimulateFailure(false)
                    }}
                  />
                  <span>💵 Efectivo en Clínica</span>
                </label>

                <label className={`payment-card ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="tarjeta"
                    onChange={() => setPaymentMethod('tarjeta')}
                  />
                  <span>💳 Tarjeta de Crédito</span>
                </label>
              </div>
            </div>

            {/* Switch / Checkbox para Simular Pago Rechazado (Demostración) */}
            {paymentMethod === 'tarjeta' && (
              <div className="simulation-toggle-box">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={simulateFailure}
                    onChange={(e) => setSimulateFailure(e.target.checked)}
                  />
                  ⚠️ <strong>Simular Pago Rechazado</strong> (para prueba de pantalla)
                </label>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="button-group margin-top">
              <button type="button" className="secondary-button" onClick={() => navigate('/patient')}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={!paymentMethod}>
                Confirmar y Agendar
              </button>
            </div>
          </form>
        )}

        {/* PANTALLA: PAGO EXITOSO */}
        {paymentState === 'success' && (
          <div className="result-container success">
            <div className="icon-badge success-icon">✓</div>
            <h2>Turno Confirmado. Detalles:</h2>
            <p>La transacción fue procesada correctamente.</p>

            <div className="receipt-box">
              <div className="receipt-row">
                <span>Servicio:</span>
                <strong>{MOCK_SERVICES.find((s) => s.id === selectedService)?.name}</strong>
              </div>
              <div className="receipt-row">
                <span>Profesional:</span>
                <span>{MOCK_DOCTORS.find((d) => d.id === selectedDoctor)?.name}</span>
              </div>
              <div className="receipt-row">
                <span>Fecha y Hora:</span>
                <span>{selectedDate} - {selectedTime} hs</span>
              </div>
              <div className="receipt-row">
                <span>Estado del Pago:</span>
                <span className="status-approved">APROBADO</span>
              </div>
            </div>

            <button type="button" className="primary-button margin-top" onClick={() => navigate('/patient')}>
              Volver al Menú Principal
            </button>
          </div>
        )}

        {/* PANTALLA: PAGO RECHAZADO */}
        {paymentState === 'rejected' && (
          <div className="result-container error">
            <div className="icon-badge error-icon">✕</div>
            <h2>Transacción Rechazada</h2>
            <p className="error-message-text">
              "La transacción de pago fue rechazada. El turno no pudo ser confirmado."
            </p>

            <div className="rejection-info-box">
              <p>Por favor, intenta con otra tarjeta o selecciona la opción de pago en efectivo.</p>
            </div>

            <div className="button-group margin-top">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setPaymentState('form')
                  setSimulateFailure(false)
                }}
              >
                Reintentar Pago
              </button>
              <button type="button" className="primary-button" onClick={() => navigate('/patient')}>
                Volver al Menú Principal
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}