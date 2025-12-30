const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('apiToken');
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getToken();
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    let responseData: any = {};
    try {
      const text = await response.text();
      if (text) {
        responseData = JSON.parse(text);
      }
    } catch {
      // JSON parse failed, use empty object
      responseData = {};
    }

    if (!response.ok) {
      const errorMessage = responseData?.error || responseData?.message || 'Request failed';
      throw new ApiError(
        errorMessage,
        response.status,
        responseData
      );
    }

    return responseData as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Better error handling for fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        `Network error: Unable to connect to API. Please check your connection and try again.`,
        0,
        { originalError: error.message, endpoint }
      );
    }
    
    // Re-throw as ApiError if it's not already
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      { originalError: error }
    );
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export function setApiToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('apiToken', token);
  }
}

export function removeApiToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('apiToken');
  }
}

