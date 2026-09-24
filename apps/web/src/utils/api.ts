/**
 * api.ts — Utilitário de requisições HTTP para a API NestJS.
 *
 * CONCEITOS REST & CLIENTE HTTP:
 * 1. Centralização: Em vez de espalhar fetch() com headers repetidos por todo o app,
 *    esta função apiFetch() injeta automaticamente o header 'Authorization: Bearer <token>'
 *    e 'Content-Type: application/json'.
 * 2. Interceptor de Erro: Lança exceções amigáveis e detecta 401 (token expirado ou inválido)
 *    para permitir deslogar ou redirecionar.
 */

export const API_BASE_URL = 'http://localhost:4000';

const TOKEN_KEY = '@deliveryhub:token';
const USER_KEY = '@deliveryhub:user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN';
  phone?: string;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: StoredUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erro ao salvar auth no localStorage', err);
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Erro ao limpar auth do localStorage', err);
  }
}

export interface ApiFetchOptions extends RequestInit {
  data?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { data, headers = {}, ...rest } = options;

  const token = getStoredToken();
  const reqHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  let body = rest.body;
  if (data !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const response = await fetch(url, {
    ...rest,
    headers: reqHeaders,
    body,
  });

  if (!response.ok) {
    let errorMessage = `Erro HTTP ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.message || errorJson.error || errorMessage;
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.join(', ');
      }
    } catch {
      // RESPONSE INVALIDO
    }

    if (response.status === 401) {
      // TOKEN 
      clearStoredAuth();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    throw new Error(errorMessage);
  }


  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json();
}
