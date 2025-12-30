import { auth } from '@/app/api/auth/[...nextauth]/route';
import { headers } from 'next/headers';
import { ApiError } from './api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

async function getServerToken(): Promise<string | null> {
  try {
    const session = await auth();
    return session?.user?.apiToken || null;
  } catch {
    return null;
  }
}

async function getBaseUrl(): Promise<string> {
  // Try to get from environment variable first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Try to get from headers (request URL)
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch {
    // Headers might not be available in all contexts
  }

  // Fallback to localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Production fallback (should be set via env var)
  return '';
}

async function serverApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const token = await getServerToken();
    
    // Build absolute URL for server-side requests
    let url: string;
    if (endpoint.startsWith('http')) {
      url = endpoint;
    } else {
      const baseUrl = await getBaseUrl();
      const apiBase = API_BASE.startsWith('http') ? API_BASE : `${baseUrl}${API_BASE}`;
      url = `${apiBase}${endpoint}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      cache: 'no-store', // Always fetch fresh data on server
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
        { originalError: error instanceof Error ? error.message : 'Unknown error', endpoint }
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

export const serverApi = {
  get: <T>(endpoint: string) => serverApiRequest<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    serverApiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: any) =>
    serverApiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) =>
    serverApiRequest<T>(endpoint, { method: 'DELETE' }),
};

