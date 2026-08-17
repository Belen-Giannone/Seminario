import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/patient/book-appointment')
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="login-badge">SysSalud</span>
          <h1>Iniciar sesión</h1>
          <p>Accedé al sistema de forma segura</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label>Usuario</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su usuario o correo"
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="primary-button">
            Iniciar sesión
          </button>
        </form>

        <p className="login-footer">
          ¿No tienes una cuenta?{' '}
          <Link to="/register">Registrarse como Paciente</Link>
        </p>
      </section>
    </main>
  )
}