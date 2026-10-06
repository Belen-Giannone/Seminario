import type {
  AuthResponse,
  BuscarHistoriaQuery,
  CrearEntradaRequest,
  CrearPacienteRequest,
  EntradaCreadaResponse,
  HistoriaClinica,
  HistoriaClinicaInexistente,
  LiquidacionPago,
  LoginRequest,
  Paciente,
  PacienteResumen,
  PagarTurnoRequest,
  RegisterPacienteRequest,
  ReprogramarTurnoRequest,
  ResultadoBusquedaHistoria,
  SolicitarTurnoRequest,
  Turno,
  TurnoResumen,
  UsuarioPerfil,
} from '@syssalud/shared-types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Nest ValidationPipe devuelve `message` como string o como array de errores por campo. */
function extraerMensaje(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(' · ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // sin cuerpo JSON, se usa el fallback
    }
    throw new ApiError(extraerMensaje(body, 'Ocurrió un error inesperado'), res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (data: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  register: (data: RegisterPacienteRequest) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: (token: string) => request<UsuarioPerfil>('/auth/me', { method: 'GET' }, token),

  pacientes: {
    buscar: (buscar: string, token: string) => {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set('buscar', buscar.trim());
      return request<PacienteResumen[]>(`/pacientes?${params}`, {}, token);
    },
    obtener: (id: string, token: string) =>
      request<Paciente>(`/pacientes/${encodeURIComponent(id)}`, {}, token),
    registrar: (data: CrearPacienteRequest, token: string) =>
      request<Paciente>('/pacientes', { method: 'POST', body: JSON.stringify(data) }, token),
  },

  historiaClinica: {
    buscar: (query: BuscarHistoriaQuery, token: string) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim());
      });
      return request<ResultadoBusquedaHistoria>(`/historia-clinica?${params}`, {}, token);
    },
    obtener: (pacienteId: string, token: string) =>
      request<HistoriaClinica | HistoriaClinicaInexistente>(
        `/historia-clinica/${encodeURIComponent(pacienteId)}`,
        {},
        token,
      ),
    inicializar: (pacienteId: string, token: string) =>
      request<HistoriaClinica>(
        `/historia-clinica/${encodeURIComponent(pacienteId)}`,
        { method: 'POST' },
        token,
      ),
    agregarEntrada: (pacienteId: string, data: CrearEntradaRequest, token: string) =>
      request<EntradaCreadaResponse>(
        `/historia-clinica/${encodeURIComponent(pacienteId)}/entradas`,
        { method: 'POST', body: JSON.stringify(data) },
        token,
      ),
  },
  turnos: {
    solicitar: (data: SolicitarTurnoRequest, token: string) =>
      request<{ turno: Turno; liquidacion: LiquidacionPago }>(
        '/turnos',
        { method: 'POST', body: JSON.stringify(data) },
        token,
      ),
    pagar: (id: string, data: PagarTurnoRequest, token: string) =>
      request<Turno>(`/turnos/${encodeURIComponent(id)}/pago`, { method: 'POST', body: JSON.stringify(data) }, token),
    listar: (
      query: { pacienteId?: string; profesionalId?: string; estado?: string; desde?: string; hasta?: string },
      token: string,
    ) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value?.trim()) params.set(key, value.trim());
      });
      return request<TurnoResumen[]>(`/turnos?${params}`, {}, token);
    },
    obtener: (id: string, token: string) => request<Turno>(`/turnos/${encodeURIComponent(id)}`, {}, token),
    misTurnos: (token: string) => request<TurnoResumen[]>('/turnos/mis-turnos', {}, token),
    cancelar: (id: string, motivo: string | undefined, token: string) =>
      request<Turno>(
        `/turnos/${encodeURIComponent(id)}/cancelar`,
        { method: 'POST', body: JSON.stringify(motivo ? { motivo } : {}) },
        token,
      ),
    reprogramar: (id: string, data: ReprogramarTurnoRequest, token: string) =>
      request<Turno>(
        `/turnos/${encodeURIComponent(id)}/reprogramar`,
        { method: 'POST', body: JSON.stringify(data) },
        token,
      ),
    marcarAsistencia: (id: string, token: string) =>
      request<Turno>(`/turnos/${encodeURIComponent(id)}/asistencia`, { method: 'POST' }, token),
  },
};

export { ApiError };
