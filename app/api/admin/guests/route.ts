import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const db = getD1Client();

    const [guestMonitors, guestLoadTests] = await Promise.all([
      db.queryAll<{
        id: string;
        url: string;
        guest_ip: string | null;
        is_active: number;
        last_status: string | null;
        created_at: number;
        expires_at: number | null;
      }>(
        `SELECT id, url, guest_ip, is_active, last_status, created_at, expires_at
         FROM monitors
         WHERE user_id IS NULL AND guest_ip IS NOT NULL
         ORDER BY created_at DESC`
      ),
      db.queryAll<{
        id: string;
        url: string;
        target_url: string;
        target_concurrent_users: number;
        total_sent: number;
        total_ok: number;
        total_errors: number;
        duration_sec: number;
        p95: number | null;
        status: string;
        ip_address: string | null;
        created_at: number;
      }>(
        `SELECT id, url, target_url, target_concurrent_users, total_sent, total_ok, total_errors,
                duration_sec, p95, status, ip_address, created_at
         FROM load_tests
         WHERE user_id IS NULL
         ORDER BY created_at DESC`
      ),
    ]);

    return successResponse({ guestMonitors, guestLoadTests });
  } catch (error: any) {
    console.error('Admin guests error:', error);
    return errorResponse(error.message || 'Failed to fetch guests', 500);
  }
}
