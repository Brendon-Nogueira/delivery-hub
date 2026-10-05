import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  apiFetch,
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  StoredUser,
} from '../utils/api';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER';
  phone?: string;
}

interface AuthContextData {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'CUSTOMER' | 'RESTAURANT' | 'DRIVER', customEmail?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(false);

  
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; user: StoredUser }>('/api/v1/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      setStoredAuth(res.accessToken, res.user);
      setToken(res.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ accessToken: string; user: StoredUser }>('/api/v1/auth/register', {
        method: 'POST',
        data,
      });

      setStoredAuth(res.accessToken, res.user);
      setToken(res.accessToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  // Login rápido com credenciais padrão ativado exclusivamente em desenvolvimento
  const quickLogin = async (role: 'CUSTOMER' | 'RESTAURANT' | 'DRIVER', customEmail?: string) => {
    if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS !== 'true') {
      throw new Error('Login rápido de demonstração está desativado neste ambiente de produção.');
    }

    const defaultDevPass = (import.meta.env.VITE_DEMO_PASSWORD as string) || '123456';
    const credentials = {
      CUSTOMER: { email: 'cliente@teste.com', pass: defaultDevPass },
      RESTAURANT: { email: 'dono@restaurante.com', pass: defaultDevPass },
      DRIVER: { email: 'driver@teste.com', pass: defaultDevPass },
    }[role];

    const emailToUse = customEmail || credentials.email;
    await login(emailToUse, credentials.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
