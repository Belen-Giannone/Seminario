import type {
  AuthResponse,
  LoginRequest,
  RegisterPacienteRequest,
  UsuarioPerfil, 
  Profesional,
  CrearProfesionalRequest,
  CrearHorarioRequest,
  HorarioAtencion,
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
  listarProfesionales: (token: string) =>
    request<Profesional[]>('/profesionales', { method: 'GET' }, token),

  obtenerProfesional: (id: string, token: string) =>
    request<Profesional>(`/profesionales/${id}`, { method: 'GET' }, token),

  crearProfesional: (data: CrearProfesionalRequest, token: string) =>
    request<Profesional>('/profesionales', { method: 'POST', body: JSON.stringify(data) }, token),

  agregarHorarioProfesional: (profesionalId: string, data: CrearHorarioRequest, token: string) =>
    request<HorarioAtencion>(
      `/profesionales/${profesionalId}/horarios`,
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),
};

export { ApiError };
