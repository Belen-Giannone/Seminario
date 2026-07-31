import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Register.css'

export default function Register() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    dni: '',
    lastName: '',
    firstName: '',
    address: '',
    phone: '',
    email: '',
    birthDate: '',
  })

  const [isRegistered, setIsRegistered] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsRegistered(true)
  }

  return (
    <main className="register-page">
      <section className="register-panel">
        <div className="register-brand">
          <span className="register-badge">SysSalud</span>
          <h1>Registro de paciente</h1>
          <p>Completá tus datos para crear una cuenta</p>
        </div>

        {isRegistered ? (
          <div className="register-success">
            <div className="register-success-box">Registro exitoso</div>
            <p>El paciente ha sido dado de alta correctamente en SysSalud.</p>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigate('/login')}
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="field">
              <label>DNI</label>
              <input
                type="text"
                name="dni"
                required
                value={formData.dni}
                onChange={handleChange}
                placeholder="Ingrese número de documento"
              />
            </div>

            <div className="field">
              <label>Apellido</label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Ingrese apellido"
              />
            </div>

            <div className="field">
              <label>Nombre</label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Ingrese nombre"
              />
            </div>

            <div className="field">
              <label>Domicilio</label>
              <input
                type="text"
                name="address"
                required
                value={formData.address}
                onChange={handleChange}
                placeholder="Ingrese dirección"
              />
            </div>

            <div className="field">
              <label>Teléfono</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ej: 3411234567"
              />
            </div>

            <div className="field">
              <label>Mail</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="field">
              <label>Fecha de nacimiento</label>
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="primary-button">
              Confirmar registro
            </button>
          </form>
        )}

        {!isRegistered && (
          <p className="register-footer">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login">Iniciar Sesión</Link>
          </p>
        )}
      </section>
    </main>
  )
}