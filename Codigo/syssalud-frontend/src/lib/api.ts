import type {
  AuthResponse,
  LoginRequest,
  RegisterPacienteRequest,
  UsuarioPerfil,
  Servicio,
  ServicioResumen,
  CrearServicioRequest,
  ActualizarServicioRequest,
  ProfesionalResumen
} from '@syssalud/shared-types';

const API_BASE = '/api';

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
};

export const servicios = {
  listar: async (token: string, soloActivos: boolean = true): Promise<ServicioResumen[]> => {
    return request(`${API_BASE}/servicios?soloActivos=${soloActivos}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  obtener: async (token: string, id: string): Promise<Servicio> => {
    return request(`${API_BASE}/servicios/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  profesionales: async (token: string, id: string): Promise<ProfesionalResumen[]> => {
    return request(`${API_BASE}/servicios/${id}/profesionales`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  crear: async (token: string, data: CrearServicioRequest): Promise<Servicio> => {
    return request(`${API_BASE}/servicios`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  actualizar: async (
    token: string,
    id: string,
    data: ActualizarServicioRequest
  ): Promise<Servicio> => {
    return request(`${API_BASE}/servicios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  baja: async (token: string, id: string): Promise<void> => {
    await request(`${API_BASE}/servicios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  estado: async (): Promise<{
    modulo: string;
    dependencias: Record<string, 'ok' | 'no-disponible'>;
    modoValidacion: string;
  }> => {
    return request(`${API_BASE}/servicios/_estado`);
  },
};

// MÉTODOS DE PROFESIONALES (para selección)
export const profesionales = {
  listar: async (token: string): Promise<ProfesionalResumen[]> => {
    return request(`${API_BASE}/profesionales`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export { ApiError };
