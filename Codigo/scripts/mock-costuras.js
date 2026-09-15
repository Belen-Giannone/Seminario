/**
 * Servidor mock de las costuras REST de Profesionales, Turnos y Servicios,
 * SOLO para probar a mano el módulo Agenda (CUU05) mientras esos módulos
 * siguen siendo esqueletos. No es parte de la app real: es una ayuda de
 * desarrollo que simula lo que esos módulos van a exponer.
 *
 * Uso:
 *   node scripts/mock-costuras.js
 *
 * Después, en syssalud-backend/.env apuntá las costuras acá y reiniciá el backend:
 *   PROFESIONALES_API_URL=http://localhost:4100/api
 *   TURNOS_API_URL=http://localhost:4100/api
 *   SERVICIOS_API_URL=http://localhost:4100/api
 */
const http = require('http');
const { URL } = require('url');

const PORT = 4100;

// Mismo id que usa el fixture de shared-types y el mismo nombre que el
// profesional demo del seed (profesional@syssalud.com).
const PROFESIONAL_ID = '11111111-1111-1111-1111-111111111111';
const PROFESIONAL = { id: PROFESIONAL_ID, nombre: 'Carlos', apellido: 'Bilardo' };

const HORARIOS = [
  { diaSemana: 1, horaInicio: '09:00', horaFin: '13:00' },
  { diaSemana: 1, horaInicio: '14:00', horaFin: '18:00' },
  { diaSemana: 2, horaInicio: '09:00', horaFin: '13:00' },
  { diaSemana: 3, horaInicio: '09:00', horaFin: '13:00' },
  { diaSemana: 3, horaInicio: '14:00', horaFin: '18:00' },
  { diaSemana: 4, horaInicio: '09:00', horaFin: '13:00' },
  { diaSemana: 5, horaInicio: '09:00', horaFin: '13:00' },
];

const SERVICIO_ID = '22222222-2222-4222-a222-222222222222'; // UUID v4 (servicioId lo valida el DTO)
const SERVICIO = { id: SERVICIO_ID, nombre: 'Consulta clínica', duracionMin: 30 };

const TURNOS = [
  { idTurno: 't1', fecha: '2026-09-14', hora: '09:00', pacienteNombre: 'Dolores Campos', servicioNombre: 'Consulta clínica', estado: 'CONFIRMADO' },
  { idTurno: 't2', fecha: '2026-09-15', hora: '10:30', pacienteNombre: 'Marcos Díaz', servicioNombre: 'Control', estado: 'RESERVADO' },
  { idTurno: 't3', fecha: '2026-09-16', hora: '16:00', pacienteNombre: 'Lucía Fernández', servicioNombre: 'Consulta clínica', estado: 'CONFIRMADO' },
  { idTurno: 't4', fecha: '2026-09-17', hora: '11:00', pacienteNombre: 'Pedro Gómez', servicioNombre: 'Sesión de control', estado: 'RESERVADO' },
  { idTurno: 't5', fecha: '2026-09-18', hora: '15:00', pacienteNombre: 'Ana Torres', servicioNombre: 'Consulta clínica', estado: 'REPROGRAMADO' },
];

function enviar(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const partes = url.pathname.split('/').filter(Boolean); // ['api', 'profesionales', ':id', ...]

  console.log(`[mock] ${req.method} ${url.pathname}${url.search}`);

  if (partes[0] !== 'api') return enviar(res, 404);

  // GET /api/profesionales/:id/horarios
  if (partes[1] === 'profesionales' && partes[3] === 'horarios') {
    return partes[2] === PROFESIONAL_ID ? enviar(res, 200, HORARIOS) : enviar(res, 404);
  }

  // GET /api/profesionales/:id
  if (partes[1] === 'profesionales' && partes.length === 3) {
    return partes[2] === PROFESIONAL_ID ? enviar(res, 200, PROFESIONAL) : enviar(res, 404);
  }

  // GET /api/turnos?profesionalId=&desde=&hasta=
  if (partes[1] === 'turnos' && partes.length === 2) {
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');
    const items = TURNOS.filter((t) => (!desde || t.fecha >= desde) && (!hasta || t.fecha <= hasta));
    return enviar(res, 200, items);
  }

  // GET /api/servicios/:id
  if (partes[1] === 'servicios' && partes.length === 3) {
    return partes[2] === SERVICIO_ID ? enviar(res, 200, SERVICIO) : enviar(res, 404);
  }

  return enviar(res, 404);
});

server.listen(PORT, () => {
  console.log(`Mock de costuras (Profesionales/Turnos/Servicios) escuchando en http://localhost:${PORT}/api`);
  console.log(`Profesional de prueba: ${PROFESIONAL_ID} (${PROFESIONAL.nombre} ${PROFESIONAL.apellido})`);
  console.log(`Servicio de prueba: ${SERVICIO_ID} (${SERVICIO.nombre}, ${SERVICIO.duracionMin} min)`);
});
