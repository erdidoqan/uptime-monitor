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

    const tests = await db.queryAll<{
      id: string;
      user_id: string | null;
      url: string;
      target_url: string;
      target_browsers: number;
      tabs_per_browser: number;
      total_visits: number;
      total_ok: number;
      total_errors: number;
      duration_sec: number;
      status: string;
      stopped_reason: string | null;
      ip_address: string | null;
      created_at: number;
      user_email: string | null;
      user_name: string | null;
    }>(
      `SELECT bt.id, bt.user_id, bt.url, bt.target_url, bt.target_browsers, bt.tabs_per_browser,
              bt.total_visits, bt.total_ok, bt.total_errors, bt.duration_sec, bt.status,
              bt.stopped_reason, bt.ip_address, bt.created_at,
              u.email as user_email, u.name as user_name
       FROM browser_tests bt
       LEFT JOIN users u ON u.id = bt.user_id
       ORDER BY bt.created_at DESC
       LIMIT 100`
    );

    const stats = await db.queryFirst<{
      total: number;
      running: number;
      completed: number;
      total_visits: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(total_visits) as total_visits
       FROM browser_tests`
    );

    return successResponse({ tests, stats });
  } catch (error: any) {
    console.error('Admin browser tests error:', error);
    return errorResponse(error.message || 'Failed to fetch browser tests', 500);
  }
}
