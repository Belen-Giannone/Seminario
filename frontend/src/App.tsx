import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login/Login'
import Register from './pages/auth/Register/Register'
import PatientMenu from './pages/patient/PatientMenu/PatientMenu'
import DoctorMenu from './pages/doctor/DoctorMenu/DoctorMenu'
import AdminMenu from './pages/admin/AdminMenu/AdminMenu'
import OwnerMenu from './pages/owner/OwnerMenu/OwnerMenu'
import BookAppointment from './pages/auth/BookAppointment/bookAppointment'
import ManageAppointment from './pages/auth/ManageAppointment/manageAppointment'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/patient" element={<PatientMenu />} />
      <Route path="/doctor" element={<DoctorMenu />} />
      <Route path="/admin" element={<AdminMenu />} />
      <Route path="/owner" element={<OwnerMenu />} />
      <Route path="/patient/book-appointment" element={<BookAppointment />} />
      <Route path="/patient/manage-appointment" element={<ManageAppointment />} />
    </Routes>
  )
}