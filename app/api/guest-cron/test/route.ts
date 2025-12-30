import { NextRequest } from 'next/server';
import {
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

// Simple in-memory rate limiting for guest test requests
// IP -> { count: number, resetAt: number }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // max 5 requests per minute per IP

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // Start new window
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

interface TestRequest {
  url: string;
  method: string;
  headers_json?: Record<string, string> | null;
  headers?: Record<string, string> | null; // Also accept 'headers' for compatibility
  body?: string | null;
  timeout_ms?: number;
  expected_min?: number | null;
  expected_max?: number | null;
  keyword?: string | null;
}

interface TestResponse {
  success: boolean;
  status_code: number | null;
  duration_ms: number;
  response_body: string | null;
  error: string | null;
  keyword_found?: boolean;
}

export async function POST(request: NextRequest) {
  // Rate limiting check
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP);
  
  if (!rateLimit.allowed) {
    return errorResponse(
      `Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`,
      429
    );
  }

  try {
    const body: TestRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return errorResponse('URL is required', 400);
    }

    if (!body.method) {
      return errorResponse('Method is required', 400);
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return errorResponse('Invalid URL format', 400);
    }

    const timeout = body.timeout_ms || 10000; // Default 10s for guest
    const expectedMin = body.expected_min ?? 200;
    const expectedMax = body.expected_max ?? 299;

    // Prepare headers (accept both headers_json and headers)
    const headers: HeadersInit = {};
    const requestHeaders = body.headers_json || body.headers;
    if (requestHeaders && Object.keys(requestHeaders).length > 0) {
      Object.assign(headers, requestHeaders);
    }

    // Make the test request
    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;
    let keywordFound: boolean | undefined = undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(body.url, {
        method: body.method,
        headers,
        body: body.method !== 'GET' && body.body ? body.body : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      statusCode = response.status;

      // Get response body (truncate to 10KB for display)
      const text = await response.text();
      responseBody = text.length > 10240 ? text.substring(0, 10240) + '...[truncated]' : text;

      // Check keyword if provided
      if (body.keyword) {
        keywordFound = text.includes(body.keyword);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          error = `Request timed out after ${timeout}ms`;
        } else {
          error = err.message;
        }
      } else {
        error = 'Unknown error occurred';
      }
    }

    const durationMs = Date.now() - startTime;

    // Determine success
    let success = false;
    if (statusCode !== null) {
      success = statusCode >= expectedMin && statusCode <= expectedMax;
      
      // If keyword is required and not found, it's a failure
      if (success && body.keyword && keywordFound === false) {
        success = false;
        error = `Keyword "${body.keyword}" not found in response`;
      }
    }

    const result: TestResponse = {
      success,
      status_code: statusCode,
      duration_ms: durationMs,
      response_body: responseBody,
      error,
      keyword_found: keywordFound,
    };

    return successResponse(result);
  } catch (err) {
    console.error('Guest test cron job error:', err);
    return errorResponse('Failed to test cron job', 500);
  }
}

