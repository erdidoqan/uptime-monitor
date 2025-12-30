import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { calculateNextRun } from '@/lib/cron-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'cron-jobs:read')) {
      return errorResponse('Insufficient permissions. Required scope: cron-jobs:read', 403);
    }

    const { id } = await params;
    const cronJobId = id;
    const db = getD1Client();

    // Get cron job - only if it belongs to the user
    const cronJob = await db.queryFirst(
      'SELECT * FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    return successResponse(cronJob);
  } catch (error: any) {
    console.error('Get cron job error:', error);
    return errorResponse(error.message || 'Failed to fetch cron job', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'cron-jobs:write')) {
      return errorResponse('Insufficient permissions. Required scope: cron-jobs:write', 403);
    }

    const { id } = await params;
    const cronJobId = id;
    const db = getD1Client();

    // Check if cron job exists and belongs to this user
    const cronJob = await db.queryFirst<{ id: string }>(
      'SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    const body = await request.json();
    const {
      name,
      url,
      method,
      headers_json,
      body: requestBody,
      cron_expr,
      interval_sec,
      timeout_ms,
      expected_min,
      expected_max,
      keyword,
      is_active,
    } = body;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name || null);
    }
    if (url !== undefined) {
      updates.push('url = ?');
      values.push(url);
    }
    if (method !== undefined) {
      updates.push('method = ?');
      values.push(method);
    }
    if (headers_json !== undefined) {
      updates.push('headers_json = ?');
      values.push(headers_json ? JSON.stringify(headers_json) : null);
    }
    if (requestBody !== undefined) {
      updates.push('body = ?');
      values.push(requestBody || null);
    }
    if (cron_expr !== undefined) {
      updates.push('cron_expr = ?');
      values.push(cron_expr || null);
      // Recalculate next_run_at if cron_expr changed
      const current = await db.queryFirst<{
        interval_sec: number | null;
      }>('SELECT interval_sec FROM cron_jobs WHERE id = ?', [cronJobId]);
      updates.push('next_run_at = ?');
      values.push(
        calculateNextRun(cron_expr || null, current?.interval_sec || null)
      );
    }
    if (interval_sec !== undefined) {
      updates.push('interval_sec = ?');
      values.push(interval_sec || null);
      // Recalculate next_run_at if interval_sec changed
      const current = await db.queryFirst<{
        cron_expr: string | null;
      }>('SELECT cron_expr FROM cron_jobs WHERE id = ?', [cronJobId]);
      updates.push('next_run_at = ?');
      values.push(
        calculateNextRun(current?.cron_expr || null, interval_sec || null)
      );
    }
    if (timeout_ms !== undefined) {
      updates.push('timeout_ms = ?');
      values.push(timeout_ms);
    }
    if (expected_min !== undefined) {
      updates.push('expected_min = ?');
      values.push(expected_min || null);
    }
    if (expected_max !== undefined) {
      updates.push('expected_max = ?');
      values.push(expected_max || null);
    }
    if (keyword !== undefined) {
      updates.push('keyword = ?');
      values.push(keyword || null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      
      // When reactivating a paused job, recalculate next_run_at
      if (is_active) {
        const current = await db.queryFirst<{
          cron_expr: string | null;
          interval_sec: number | null;
        }>('SELECT cron_expr, interval_sec FROM cron_jobs WHERE id = ?', [cronJobId]);
        
        if (current) {
          updates.push('next_run_at = ?');
          values.push(calculateNextRun(current.cron_expr, current.interval_sec));
          // Clear any stale lock
          updates.push('locked_at = ?');
          values.push(null);
        }
      }
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update');
    }

    values.push(cronJobId);

    await db.execute(
      `UPDATE cron_jobs SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await db.queryFirst(
      'SELECT * FROM cron_jobs WHERE id = ?',
      [cronJobId]
    );

    return successResponse(updated);
  } catch (error: any) {
    console.error('Update cron job error:', error);
    return errorResponse(error.message || 'Failed to update cron job', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'cron-jobs:write')) {
      return errorResponse('Insufficient permissions. Required scope: cron-jobs:write', 403);
    }

    const { id } = await params;
    const cronJobId = id;
    const db = getD1Client();

    // Check if cron job exists and belongs to this user
    const cronJob = await db.queryFirst<{ id: string }>(
      'SELECT id FROM cron_jobs WHERE id = ? AND user_id = ?',
      [cronJobId, auth.userId]
    );

    if (!cronJob) {
      return errorResponse('Cron job not found', 404);
    }

    // Delete cron runs first
    await db.execute('DELETE FROM cron_runs WHERE cron_job_id = ?', [
      cronJobId,
    ]);

    // Delete cron job
    await db.execute('DELETE FROM cron_jobs WHERE id = ?', [cronJobId]);

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('Delete cron job error:', error);
    return errorResponse(error.message || 'Failed to delete cron job', 500);
  }
}

