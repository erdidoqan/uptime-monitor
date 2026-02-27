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

    const users = await db.queryAll<{
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      created_at: number;
      monitor_count: number;
      cron_count: number;
      status_page_count: number;
      load_test_count: number;
      browser_test_count: number;
      traffic_campaign_count: number;
      subscription_status: string | null;
      subscription_plan: string | null;
      is_banned: number;
    }>(
      `SELECT u.id, u.email, u.name, u.image, u.created_at, u.is_banned,
        (SELECT COUNT(*) FROM monitors WHERE user_id = u.id) as monitor_count,
        (SELECT COUNT(*) FROM cron_jobs WHERE user_id = u.id) as cron_count,
        (SELECT COUNT(*) FROM status_pages WHERE user_id = u.id) as status_page_count,
        (SELECT COUNT(*) FROM load_tests WHERE user_id = u.id) as load_test_count,
        (SELECT COUNT(*) FROM browser_tests WHERE user_id = u.id) as browser_test_count,
        (SELECT COUNT(*) FROM traffic_campaigns WHERE user_id = u.id) as traffic_campaign_count,
        s.status as subscription_status, s.plan as subscription_plan
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      ORDER BY u.created_at DESC`
    );

    return successResponse({ users });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return errorResponse(error.message || 'Failed to fetch users', 500);
  }
}
