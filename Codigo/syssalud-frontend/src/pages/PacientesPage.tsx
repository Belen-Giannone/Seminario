import React, { useState, useEffect } from 'react';

export function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [nuevoPaciente, setNuevoPaciente] = useState({
    dni: '',
    nombre: '',
    apellido: '',
  });

  // Aquí puedes agregar la lógica para llamar a tu API de backend (/api/pacientes)
  useEffect(() => {
    // fetchPacientes();
  }, [busqueda]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Gestión de Pacientes (Asistente)
      </h1>

      {/* Formulario de Alta (PAC-027) */}
      <div className="bg-white p-4 shadow rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4">Registrar Nuevo Paciente</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="DNI"
            className="border p-2 rounded"
            value={nuevoPaciente.dni}
            onChange={(e) =>
              setNuevoPaciente({ ...nuevoPaciente, dni: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Nombre"
            className="border p-2 rounded"
            value={nuevoPaciente.nombre}
            onChange={(e) =>
              setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Apellido"
            className="border p-2 rounded"
            value={nuevoPaciente.apellido}
            onChange={(e) =>
              setNuevoPaciente({ ...nuevoPaciente, apellido: e.target.value })
            }
          />
        </div>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Guardar Paciente
        </button>
      </div>

      {/* Buscador por DNI o Apellido (PAC-028) */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por DNI o Apellido..."
          className="border p-2 rounded w-full"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* Listado / Tabla de Pacientes con Edición y Baja */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Nro</th>
              <th className="p-3">DNI</th>
              <th className="p-3">Apellido y Nombre</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Aquí mapearás los pacientes */}
            <tr>
              <td
                className="p-3"
                colSpan={5}
                className="text-center text-gray-500 p-4"
              >
                No hay pacientes cargados o conectando con la API...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
