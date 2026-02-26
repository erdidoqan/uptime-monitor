import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  notFoundResponse,
  successResponse,
} from '@/lib/api-helpers';

const ADMIN_EMAIL = 'erdi.doqan@gmail.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const { id: userId } = await params;
    const db = getD1Client();

    const user = await db.queryFirst<{
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      created_at: number;
      is_banned: number;
    }>('SELECT id, email, name, image, created_at, is_banned FROM users WHERE id = ?', [userId]);

    if (!user) {
      return notFoundResponse('Kullanıcı bulunamadı');
    }

    const [monitors, cronJobs, statusPages, loadTests, subscription] = await Promise.all([
      db.queryAll<{
        id: string;
        name: string | null;
        url: string;
        method: string;
        is_active: number;
        last_status: string | null;
        last_checked_at: number | null;
        created_at: number;
      }>(
        `SELECT id, name, url, method, is_active, last_status, last_checked_at, created_at
         FROM monitors WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      ),
      db.queryAll<{
        id: string;
        name: string | null;
        url: string;
        method: string;
        cron_expr: string | null;
        is_active: number;
        last_status: string | null;
        last_run_at: number | null;
        created_at: number;
      }>(
        `SELECT id, name, url, method, cron_expr, is_active, last_status, last_run_at, created_at
         FROM cron_jobs WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      ),
      db.queryAll<{
        id: string;
        company_name: string;
        subdomain: string;
        custom_domain: string | null;
        is_active: number;
        created_at: number;
      }>(
        `SELECT id, company_name, subdomain, custom_domain, is_active, created_at
         FROM status_pages WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
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
        stopped_reason: string | null;
        created_at: number;
      }>(
        `SELECT id, url, target_url, target_concurrent_users, total_sent, total_ok, total_errors,
                duration_sec, p95, status, stopped_reason, created_at
         FROM load_tests WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
      ),
      db.queryFirst<{
        status: string;
        plan: string | null;
        current_period_end: number | null;
      }>(
        'SELECT status, plan, current_period_end FROM subscriptions WHERE user_id = ?',
        [userId]
      ),
    ]);

    return successResponse({
      user,
      monitors,
      cronJobs,
      statusPages,
      loadTests,
      subscription,
    });
  } catch (error: any) {
    console.error('Admin user detail error:', error);
    return errorResponse(error.message || 'Failed to fetch user detail', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth || auth.email !== ADMIN_EMAIL) {
      return unauthorizedResponse();
    }

    const { id: userId } = await params;
    const body = await request.json();
    const db = getD1Client();

    if (typeof body.is_banned === 'number') {
      await db.execute(
        'UPDATE users SET is_banned = ? WHERE id = ?',
        [body.is_banned ? 1 : 0, userId]
      );
    }

    return successResponse({ ok: true });
  } catch (error: any) {
    console.error('Admin user patch error:', error);
    return errorResponse(error.message || 'Failed to update user', 500);
  }
}
