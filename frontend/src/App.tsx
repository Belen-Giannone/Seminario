import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login/Login'
import Register from './pages/auth/Register/Register'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  )
}