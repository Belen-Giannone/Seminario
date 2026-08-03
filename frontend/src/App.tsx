import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login/Login'
import Register from './pages/auth/Register/Register'
import PatientMenu from './pages/patient/PatientMenu/PatientMenu'
import DoctorMenu from './pages/doctor/DoctorMenu/DoctorMenu'
import AdminMenu from './pages/admin/AdminMenu/AdminMenu'
import OwnerMenu from './pages/owner/OwnerMenu/OwnerMenu'
import BusinessMetrics from './pages/owner/BusinessMetrics/BusinessMetrics'
import Performance from './pages/doctor/Performance/Performance'
import DoctorAgenda from './pages/doctor/DoctorAgenda/DoctorAgenda'
import MedicalRecord from './pages/doctor/MedicalRecord/MedicalRecord'
import GeneralAgenda from './pages/admin/GeneralAgenda/GeneralAgenda'
import BookAppointment from './pages/admin/BookAppointment/BookAppointment'
import ServicesCatalog from './pages/admin/ServicesCatalog/ServicesCatalog'


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
      <Route path="/owner/metrics" element={<BusinessMetrics />} />
      <Route path="/doctor/performance" element={<Performance />} />
      <Route path="/doctor/agenda" element={<DoctorAgenda />} />
      <Route path="/doctor/medical-record" element={<MedicalRecord />} />
      <Route path="/admin/agenda" element={<GeneralAgenda />} />
      <Route path="/admin/book-appointment" element={<BookAppointment />} />
      <Route path="/admin/services" element={<ServicesCatalog />} />
    </Routes>
  )
}