/**
 * Simple API client - all requests with cookies
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  // Устанавливаем Content-Type только если есть body
  const headers: Record<string, string> = {
    ...options.headers,
  };
  
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error ${response.status}`;
    let errorData: any = null;
    try {
      errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    
    // 🔥 FLOW U1.1: Создаем расширенную ошибку с данными ответа
    const error = new Error(errorMessage) as any;
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
    throw error;
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}
