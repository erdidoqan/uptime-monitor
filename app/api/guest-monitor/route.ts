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

interface GuestMonitorRequest {
  url: string;
  method?: string;
  headers_json?: Record<string, string> | null;
  body?: string | null;
  interval_sec: number;
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    if (clientIP === 'unknown') {
      return errorResponse('IP adresiniz belirlenemedi', 400);
    }

    const body: GuestMonitorRequest = await request.json();

    // Validate required fields
    if (!body.url) {
      return errorResponse('URL gerekli', 400);
    }

    // Validate URL format
    try {
      const urlObj = new URL(body.url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return errorResponse('Sadece HTTP ve HTTPS URL\'leri kabul edilir', 400);
      }
    } catch {
      return errorResponse('Geçersiz URL formatı', 400);
    }

    // Validate method if provided
    const method = body.method || 'GET';
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
    if (!validMethods.includes(method)) {
      return errorResponse(`Geçersiz metod. İzin verilenler: ${validMethods.join(', ')}`, 400);
    }

    // Validate interval
    if (!body.interval_sec || !VALID_INTERVALS.includes(body.interval_sec)) {
      return errorResponse(
        `Geçersiz aralık. İzin verilen değerler: ${VALID_INTERVALS.map(s => `${s / 60} dakika`).join(', ')}`,
        400
      );
    }

    const db = getD1Client();

    // Check if this IP already has a guest monitor
    const existingMonitor = await db.queryFirst<{ id: string }>(
      'SELECT id FROM monitors WHERE guest_ip = ? AND expires_at > ?',
      [clientIP, Date.now()]
    );

    if (existingMonitor) {
      return errorResponse(
        'Zaten aktif bir monitörünüz var. Daha fazla monitör oluşturmak için Google ile giriş yapın.',
        409
      );
    }

    // Create the guest monitor
    const monitorId = uuidv4();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now
    const nextRunAt = now + (body.interval_sec * 1000); // First run after interval

    // Serialize headers if provided
    const headersJson = body.headers_json ? JSON.stringify(body.headers_json) : null;

    await db.execute(
      `INSERT INTO monitors (
        id, name, url, method, headers_json, body,
        interval_sec, timeout_ms,
        expected_min, expected_max, keyword, is_active, next_run_at, created_at,
        guest_ip, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        monitorId,
        null, // name
        body.url,
        method,
        headersJson,
        body.body || null,
        body.interval_sec,
        15000, // timeout_ms - 15 seconds
        200, // expected_min
        299, // expected_max
        null, // keyword
        nextRunAt,
        now,
        clientIP,
        expiresAt,
      ]
    );

    const monitor = await db.queryFirst(
      'SELECT * FROM monitors WHERE id = ?',
      [monitorId]
    );

    return successResponse({
      ...monitor,
      message: 'Monitör başarıyla oluşturuldu! 7 gün boyunca çalışacak. Kalıcı olması için giriş yapın.',
    }, 201);
  } catch (error: unknown) {
    console.error('Create guest monitor error:', error);
    const message = error instanceof Error ? error.message : 'Monitör oluşturulamadı';
    return errorResponse(message, 500);
  }
}

// GET endpoint to check if IP has existing guest monitor
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    if (clientIP === 'unknown') {
      return successResponse({ hasExistingMonitor: false });
    }

    const db = getD1Client();

    const existingMonitor = await db.queryFirst<{ id: string; url: string; interval_sec: number; expires_at: number }>(
      'SELECT id, url, interval_sec, expires_at FROM monitors WHERE guest_ip = ? AND expires_at > ?',
      [clientIP, Date.now()]
    );

    if (existingMonitor) {
      return successResponse({
        hasExistingMonitor: true,
        monitor: existingMonitor,
      });
    }

    return successResponse({ hasExistingMonitor: false });
  } catch (error) {
    console.error('Check guest monitor error:', error);
    return successResponse({ hasExistingMonitor: false });
  }
}
