import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {
  LoginRequest,
  RegisterPacienteRequest,
  UsuarioPerfil,
} from '@syssalud/shared-types';
import { api } from './api';

const STORAGE_KEY = 'syssalud_token';

interface AuthContextValue {
  usuario: UsuarioPerfil | null;
  token: string | null;
  cargando: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterPacienteRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!token) {
      setCargando(false);
      return;
    }
    api
      .me(token)
      .then(setUsuario)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUsuario(null);
      })
      .finally(() => setCargando(false));
  }, [token]);

  const guardarSesion = (accessToken: string, perfil: UsuarioPerfil) => {
    localStorage.setItem(STORAGE_KEY, accessToken);
    setToken(accessToken);
    setUsuario(perfil);
  };

  const login = async (data: LoginRequest) => {
    const { accessToken, usuario: perfil } = await api.login(data);
    guardarSesion(accessToken, perfil);
  };

  const register = async (data: RegisterPacienteRequest) => {
    const { accessToken, usuario: perfil } = await api.register(data);
    guardarSesion(accessToken, perfil);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
