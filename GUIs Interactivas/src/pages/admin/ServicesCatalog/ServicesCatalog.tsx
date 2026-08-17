import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ServicesCatalog.css';

interface ServiceItem {
  id: number;
  code: string;
  name: string;
  category: string;
  durationMin: number;
  price: number;
  active: boolean;
}

export default function ServicesCatalog() {
  const navigate = useNavigate();

  // Estado del catálogo de tratamientos estéticos (CUU10)
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 1,
      code: 'EST-001',
      name: 'Aplicación Toxina Botulínica (Botox)',
      category: 'Facial / Inyectables',
      durationMin: 45,
      price: 120000,
      active: true,
    },
    {
      id: 2,
      code: 'EST-002',
      name: 'Relleno con Ácido Hialurónico (1 ml)',
      category: 'Facial / Inyectables',
      durationMin: 60,
      price: 180000,
      active: true,
    },
    {
      id: 3,
      code: 'EST-003',
      name: 'Peeling Químico Médico',
      category: 'Dermatología / Cosmiatría',
      durationMin: 30,
      price: 45000,
      active: true,
    },
    {
      id: 4,
      code: 'EST-004',
      name: 'Consulta de Valoración Estética',
      category: 'Diagnóstico',
      durationMin: 30,
      price: 25000,
      active: true,
    },
    {
      id: 5,
      code: 'EST-005',
      name: 'Mesoterapia Corporal Anti-celulitis',
      category: 'Corporal',
      durationMin: 45,
      price: 55000,
      active: false,
    },
  ]);

  // Estados de control para el Modal / Formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState('Todas');

  // Formulario temporal
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Facial / Inyectables',
    durationMin: 30,
    price: 0,
    active: true,
  });

  // Abrir Modal para Crear
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      code: `EST-00${services.length + 1}`,
      name: '',
      category: 'Facial / Inyectables',
      durationMin: 30,
      price: 0,
      active: true,
    });
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEdit = (service: ServiceItem) => {
    setEditingId(service.id);
    setFormData({ ...service });
    setIsModalOpen(true);
  };

  // Cambiar estado Activo / Inactivo
  const handleToggleActive = (id: number) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  // Guardar (Crear o Editar)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId !== null) {
      // Modificar existente
      setServices(
        services.map((s) =>
          s.id === editingId ? { ...formData, id: editingId } : s
        )
      );
    } else {
      // Crear nuevo
      const newService: ServiceItem = {
        ...formData,
        id: Date.now(),
      };
      setServices([...services, newService]);
    }
    setIsModalOpen(false);
  };

  // Filtrado por categoría
  const filteredServices = services.filter((s) => {
    if (filterCategory === 'Todas') return true;
    return s.category === filterCategory;
  });

  return (
    <div className="catalog-container">
      {/* Encabezado */}
      <header className="catalog-header">
        <div>
          <button onClick={() => navigate('/admin/menu')} className="btn-back">
            ← Volver al Panel Administrativo
          </button>
          <h1>Mantener Catálogo de Servicios</h1>
          <p className="subtitle">Gestión de tratamientos, duraciones y aranceles de la clínica</p>
        </div>
        <button onClick={handleOpenCreate} className="btn-create">
          ➕ Nuevo Tratamiento
        </button>
      </header>

      {/* Bar de Filtros */}
      <section className="catalog-controls">
        <div className="control-group">
          <label>Filtrar por Categoría:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="Todas">Todas las categorías</option>
            <option value="Facial / Inyectables">Facial / Inyectables</option>
            <option value="Dermatología / Cosmiatría">Dermatología / Cosmiatría</option>
            <option value="Corporal">Corporal</option>
            <option value="Diagnóstico">Diagnóstico</option>
          </select>
        </div>

        <div className="catalog-summary">
          <span>Servicios en catálogo: <strong>{filteredServices.length}</strong></span>
        </div>
      </section>

      {/* Tabla del Catálogo de Servicios */}
      <section className="catalog-card">
        <table className="catalog-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tratamiento / Servicio</th>
              <th>Categoría</th>
              <th>Duración</th>
              <th>Precio ($)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.id} className={!service.active ? 'row-inactive' : ''}>
                <td className="font-mono text-sky">{service.code}</td>
                <td className="font-medium">{service.name}</td>
                <td>{service.category}</td>
                <td>⏱️ {service.durationMin} min</td>
                <td className="font-semibold">${service.price.toLocaleString('es-AR')}</td>
                <td>
                  <span className={`badge badge-${service.active ? 'active' : 'inactive'}`}>
                    {service.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleOpenEdit(service)}
                      className="btn-action edit"
                      title="Editar Tratamiento"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(service.id)}
                      className={`btn-action toggle ${service.active ? 'disable' : 'enable'}`}
                    >
                      {service.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Modal / Formulario para Crear/Editar Servicio (CUU10) */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>{editingId !== null ? '✏️ Editar Tratamiento' : '➕ Nuevo Tratamiento Estético'}</h2>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div>
                  <label>Código Interno:</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div>
                  <label>Nombre del Tratamiento:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Dermapen + Plasma Rico en Plaquetas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Categoría:</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Facial / Inyectables">Facial / Inyectables</option>
                    <option value="Dermatología / Cosmiatría">Dermatología / Cosmiatría</option>
                    <option value="Corporal">Corporal</option>
                    <option value="Diagnóstico">Diagnóstico</option>
                  </select>
                </div>

                <div>
                  <label>Duración Estimada (Minutos):</label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={formData.durationMin}
                    onChange={(e) => setFormData({ ...formData, durationMin: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label>Precio / Arancel ($ ARS):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label>Estado Inicial:</label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-modal-cancel"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-save">
                  💾 Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}