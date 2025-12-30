import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { calculateNextRun } from '@/lib/cron-utils';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const db = getD1Client();

    // Get all active cron jobs for this user
    const cronJobs = await db.queryAll<{
      id: string;
      cron_expr: string | null;
      interval_sec: number | null;
    }>('SELECT id, cron_expr, interval_sec FROM cron_jobs WHERE is_active = 1 AND user_id = ?', [auth.userId]);

    let updated = 0;
    for (const cronJob of cronJobs) {
      // Recalculate next_run_at based on current settings
      const newNextRunAt = calculateNextRun(cronJob.cron_expr, cronJob.interval_sec);

      await db.execute(
        `UPDATE cron_jobs SET next_run_at = ?, locked_at = NULL WHERE id = ?`,
        [newNextRunAt, cronJob.id]
      );
      updated++;
    }

    return successResponse({
      success: true,
      message: `Recalculated next_run_at for ${updated} cron jobs`,
      updated,
    });
  } catch (error: any) {
    console.error('Recalculate all next_run_at error:', error);
    return errorResponse(error.message || 'Failed to recalculate next_run_at', 500);
  }
}

