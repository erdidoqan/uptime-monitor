import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

interface TestRequest {
  url: string;
  method: string;
  headers_json?: Record<string, string> | null;
  body?: string | null;
  timeout_ms: number;
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
  const auth = await authenticateRequest(request);
  if (!auth) {
    return unauthorizedResponse();
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

    const timeout = body.timeout_ms || 5000;
    const expectedMin = body.expected_min ?? 200;
    const expectedMax = body.expected_max ?? 299;

    // Prepare headers
    const headers: HeadersInit = {};
    if (body.headers_json) {
      Object.assign(headers, body.headers_json);
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
    console.error('Test cron job error:', err);
    return errorResponse('Failed to test cron job', 500);
  }
}

