import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

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
      is_active: number;
      cron_expr: string | null;
      interval_sec: number | null;
    }>(
      'SELECT id, is_active, cron_expr, interval_sec FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    if (cronJob.is_active === 0) {
      return errorResponse('Cron job is paused', 400);
    }

    // Set next_run_at to now to trigger immediate execution
    const now = Date.now();
    await db.execute(
      'UPDATE cron_jobs SET next_run_at = ?, locked_at = NULL WHERE id = ?',
      [now, cronJobId]
    );

    // Fire-and-forget: trigger worker without waiting for response
    // This prevents Vercel function timeout (worker can take 10-20s)
    const workerUrl = process.env.WORKER_URL || 'https://uptime-scheduler.digitexa.workers.dev';
    
    // Use AbortController with 2 second timeout - we don't need to wait for full response
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    fetch(`${workerUrl}/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cron: '*/1 * * * *' }),
      signal: controller.signal,
    })
      .then(() => clearTimeout(timeoutId))
      .catch(() => clearTimeout(timeoutId));
    
    // Return immediately - job will run within 1 minute even if trigger fails
    return successResponse({
      message: 'Cron job triggered. It will run shortly.',
      next_run_at: now,
    });
  } catch (error: any) {
    console.error('Trigger cron job error:', error);
    return errorResponse(error.message || 'Failed to trigger cron job', 500);
  }
}

