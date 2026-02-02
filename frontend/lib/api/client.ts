/**
 * API client with cookie-based auth
 */

// Пустая строка = same-origin (через Next.js rewrites), иначе кросс-домен (cookies не работают)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string,
  ) {
    super(message || `API Error: ${status}`);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  // КРИТИЧНО: Никогда не выполняем fetch на сервере
  if (typeof window === 'undefined') {
    throw new ApiError(0, { error: 'API calls are only allowed on client side' }, 'Server-side API calls are not allowed');
  }

  const { method = 'GET', body, headers = {} } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  // Debug logging in development (только на клиенте)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${url}`);
  }

  // Добавляем таймаут для fetch, чтобы не зависать вечно
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 сек — 3 сек было слишком мало, запросы отменялись

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Include cookies
    signal: controller.signal,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      throw new ApiError(response.status, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return {} as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Если это AbortError (таймаут), выбрасываем понятную ошибку
    if (error.name === 'AbortError') {
      throw new ApiError(408, { error: 'Request timeout' }, 'Request timeout - server not responding');
    }
    
    // Пробрасываем ApiError как есть
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Для других ошибок создаем ApiError
    throw new ApiError(0, { error: error.message || 'Network error' }, error.message || 'Network error');
  }
}

// Auth endpoints
export const authApi = {
  register: (email: string, password: string) =>
    apiRequest<{ user: { id: string; email: string } }>('/api/auth/register', {
      method: 'POST',
      body: { email, password },
    }),

  login: (email: string, password: string) =>
    apiRequest<{ user?: { id: string; email: string }; requires2FA?: boolean; tempToken?: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  // 🔥 FLOW S3: Verify 2FA code and complete login
  verify2FA: (tempToken: string, code: string) =>
    apiRequest<{ user: { id: string; email: string } }>('/api/auth/2fa', {
      method: 'POST',
      body: { tempToken, code },
    }),

  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: {},
    }),

  me: () =>
    apiRequest<{ user: { id: string; email: string } }>('/api/auth/me'),
};
