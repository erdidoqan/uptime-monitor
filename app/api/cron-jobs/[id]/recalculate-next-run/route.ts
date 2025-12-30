import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { calculateNextRun } from '@/lib/cron-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const cronJobId = id;
    const db = getD1Client();

    // Check if cron job exists and belongs to this user
    const cronJob = await db.queryFirst<{
      id: string;
      cron_expr: string | null;
      interval_sec: number | null;
    }>(
      'SELECT id, cron_expr, interval_sec FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    // Recalculate next_run_at
    const nextRunAt = calculateNextRun(cronJob.cron_expr, cronJob.interval_sec);
    
    await db.execute(
      'UPDATE cron_jobs SET next_run_at = ? WHERE id = ?',
      [nextRunAt, cronJobId]
    );

    const updated = await db.queryFirst(
      'SELECT * FROM cron_jobs WHERE id = ?',
      [cronJobId]
    );

    return successResponse({
      message: 'Next run time recalculated',
      next_run_at: nextRunAt,
      cronJob: updated,
    });
  } catch (error: any) {
    console.error('Recalculate next run error:', error);
    return errorResponse(error.message || 'Failed to recalculate next run', 500);
  }
}

