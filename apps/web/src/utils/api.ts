/**
 * api.ts — Utilitário de requisições HTTP para a API NestJS.
 *
 * CONCEITOS REST & CLIENTE HTTP:
 * 1. Centralização: Em vez de espalhar fetch() com headers repetidos por todo o app,
 *    esta função apiFetch() injeta automaticamente o header 'Authorization: Bearer <token>'
 *    e 'Content-Type: application/json'.
 * 2. Interceptor de Erro: Lança exceções amigáveis e detecta 401 (token expirado ou inválido)
 *    para permitir deslogar ou redirecionar.
 *
 * SEGURANÇA JWT:
 * O token JWT agora é armazenado em MEMÓRIA (variável JavaScript), não no localStorage.
 * Isso protege contra ataques XSS, pois scripts maliciosos não conseguem acessar
 * variáveis de escopo do módulo.
 *
 * Limitação: ao recarregar a página (F5), o token é perdido e o usuário precisa
 * fazer login novamente. Isso é intencional — é o trade-off de segurança.
 * Para resolver isso em produção, use cookies httpOnly no backend (NestJS).
 *
 * O `user` (dados não-sensíveis como nome e email) ainda é salvo no localStorage
 * para exibir a UI rapidamente, mas NÃO contém o token.
 */

export const API_BASE_URL = 'http://localhost:4000';

const USER_KEY = '@deliveryhub:user';

// Token JWT armazenado APENAS em memória (protegido contra XSS)
let inMemoryToken: string | null = null;

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'DRIVER' | 'ADMIN';
  phone?: string;
}

/**
 * Retorna o token JWT da memória.
 * Não persiste entre recarregamentos de página — isso é intencional.
 */
export function getStoredToken(): string | null {
  return inMemoryToken;
}

/**
 * Retorna os dados do usuário do localStorage.
 * São dados NÃO-sensíveis, usados apenas para renderizar a UI.
 */
export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Armazena a autenticação:
 * - Token: na memória (seguro contra XSS)
 * - User: no localStorage (dados não-sensíveis para a UI)
 */
export function setStoredAuth(token: string, user: StoredUser) {
  inMemoryToken = token;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Erro ao salvar user no localStorage', err);
  }
}

/**
 * Limpa autenticação: memória + localStorage.
 */
export function clearStoredAuth() {
  inMemoryToken = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Erro ao limpar auth', err);
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
      // Response inválido
    }

    if (response.status === 401) {
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
