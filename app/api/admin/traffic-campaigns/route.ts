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

    const campaigns = await db.queryAll<{
      id: string;
      user_id: string;
      name: string;
      url: string;
      daily_visitors: number;
      traffic_source: string;
      session_duration: string;
      use_proxy: number;
      is_active: number;
      last_run_at: number | null;
      last_status: string | null;
      total_runs: number;
      total_visits_sent: number;
      created_at: number;
      user_email: string | null;
      user_name: string | null;
    }>(
      `SELECT tc.id, tc.user_id, tc.name, tc.url, tc.daily_visitors, tc.traffic_source,
              tc.session_duration, tc.use_proxy, tc.is_active, tc.last_run_at, tc.last_status,
              tc.total_runs, tc.total_visits_sent, tc.created_at,
              u.email as user_email, u.name as user_name
       FROM traffic_campaigns tc
       LEFT JOIN users u ON u.id = tc.user_id
       ORDER BY tc.created_at DESC
       LIMIT 100`
    );

    const stats = await db.queryFirst<{
      total: number;
      active: number;
      total_runs: number;
      total_visits: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(total_runs) as total_runs,
        SUM(total_visits_sent) as total_visits
       FROM traffic_campaigns`
    );

    return successResponse({ campaigns, stats });
  } catch (error: any) {
    console.error('Admin traffic campaigns error:', error);
    return errorResponse(error.message || 'Failed to fetch traffic campaigns', 500);
  }
}
