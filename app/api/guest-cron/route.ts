import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';

// Get client IP from request
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

// Valid interval presets in seconds
const VALID_INTERVALS = [300, 600, 900, 1800]; // 5, 10, 15, 30 minutes

interface GuestCronRequest {
  url: string;
  method: string;
  headers_json?: Record<string, string> | null;
  body?: string | null;
  interval_sec: number;
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    if (clientIP === 'unknown') {
      return errorResponse('Could not determine your IP address', 400);
    }

    const body: GuestCronRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return errorResponse('URL is required', 400);
    }

    if (!body.method) {
      return errorResponse('Method is required', 400);
    }

    // Validate URL format
    try {
      const urlObj = new URL(body.url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return errorResponse('Only HTTP and HTTPS URLs are allowed', 400);
      }
    } catch {
      return errorResponse('Invalid URL format', 400);
    }

    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    if (!validMethods.includes(body.method)) {
      return errorResponse(`Invalid method. Allowed: ${validMethods.join(', ')}`, 400);
    }

    // Validate interval
    if (!body.interval_sec || !VALID_INTERVALS.includes(body.interval_sec)) {
      return errorResponse(
        `Invalid interval. Allowed values: ${VALID_INTERVALS.map(s => `${s / 60} minutes`).join(', ')}`,
        400
      );
    }

    const db = getD1Client();

    // Check if this IP already has a guest cron
    const existingCron = await db.queryFirst<{ id: string }>(
      'SELECT id FROM cron_jobs WHERE guest_ip = ? AND expires_at > ?',
      [clientIP, Date.now()]
    );

    if (existingCron) {
      return errorResponse(
        'You already have an active cron job. Sign in with Google to create more.',
        409
      );
    }

    // Create the guest cron job
    const cronJobId = uuidv4();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now
    const nextRunAt = now + (body.interval_sec * 1000); // First run after interval

    // Serialize headers if provided
    const headersJson = body.headers_json ? JSON.stringify(body.headers_json) : null;

    await db.execute(
      `INSERT INTO cron_jobs (
        id, name, url, method, headers_json, body,
        cron_expr, interval_sec, timeout_ms,
        expected_min, expected_max, keyword, is_active, next_run_at, created_at,
        guest_ip, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        cronJobId,
        null, // name
        body.url,
        body.method,
        headersJson,
        body.body || null,
        null, // cron_expr
        body.interval_sec,
        30000, // timeout_ms - 30 seconds
        200, // expected_min
        299, // expected_max
        null, // keyword
        nextRunAt,
        now,
        clientIP,
        expiresAt,
      ]
    );

    const cronJob = await db.queryFirst(
      'SELECT * FROM cron_jobs WHERE id = ?',
      [cronJobId]
    );

    return successResponse({
      ...cronJob,
      message: 'Cron job created successfully! It will run for 7 days. Sign in to keep it permanently.',
    }, 201);
  } catch (error: unknown) {
    console.error('Create guest cron job error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create cron job';
    return errorResponse(message, 500);
  }
}

// GET endpoint to check if IP has existing guest cron
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    if (clientIP === 'unknown') {
      return successResponse({ hasExistingCron: false });
    }

    const db = getD1Client();

    const existingCron = await db.queryFirst<{ id: string; url: string; interval_sec: number; expires_at: number }>(
      'SELECT id, url, interval_sec, expires_at FROM cron_jobs WHERE guest_ip = ? AND expires_at > ?',
      [clientIP, Date.now()]
    );

    if (existingCron) {
      return successResponse({
        hasExistingCron: true,
        cron: existingCron,
      });
    }

    return successResponse({ hasExistingCron: false });
  } catch (error) {
    console.error('Check guest cron error:', error);
    return successResponse({ hasExistingCron: false });
  }
}

