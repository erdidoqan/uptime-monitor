import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { calculateNextRun } from '@/lib/cron-utils';
import { v4 as uuidv4 } from 'uuid';
import { canCreateResource } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'cron-jobs:read')) {
      return errorResponse('Insufficient permissions. Required scope: cron-jobs:read', 403);
    }

    const db = getD1Client();
    // Get only cron jobs belonging to this user
    const cronJobs = await db.queryAll(
      `SELECT * FROM cron_jobs WHERE user_id = ? ORDER BY created_at DESC`,
      [auth.userId]
    );

    return successResponse(cronJobs);
  } catch (error: any) {
    console.error('Get cron jobs error:', error);
    return errorResponse(error.message || 'Failed to fetch cron jobs', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'cron-jobs:write')) {
      return errorResponse('Insufficient permissions. Required scope: cron-jobs:write', 403);
    }

    // Check subscription limits
    const resourceCheck = await canCreateResource(auth.userId);
    if (!resourceCheck.allowed) {
      return errorResponse(resourceCheck.reason || 'Kaynak limiti aşıldı', 402);
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
    } = body;

    if (!url || !method || !timeout_ms) {
      return errorResponse('url, method, and timeout_ms are required');
    }

    if (!cron_expr && !interval_sec) {
      return errorResponse('Either cron_expr or interval_sec is required');
    }

    const db = getD1Client();
    const cronJobId = uuidv4();
    const nextRunAt = calculateNextRun(cron_expr || null, interval_sec || null);

    const now = Date.now();
    await db.execute(
      `INSERT INTO cron_jobs (
        id, user_id, name, url, method, headers_json, body,
        cron_expr, interval_sec, timeout_ms,
        expected_min, expected_max, keyword, is_active, next_run_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        cronJobId,
        auth.userId,
        name || null,
        url,
        method,
        headers_json ? JSON.stringify(headers_json) : null,
        requestBody || null,
        cron_expr || null,
        interval_sec || null,
        timeout_ms,
        expected_min || null,
        expected_max || null,
        keyword || null,
        nextRunAt,
        now,
      ]
    );

    const cronJob = await db.queryFirst(
      'SELECT * FROM cron_jobs WHERE id = ?',
      [cronJobId]
    );

    return successResponse(cronJob, 201);
  } catch (error: any) {
    console.error('Create cron job error:', error);
    return errorResponse(error.message || 'Failed to create cron job', 500);
  }
}

