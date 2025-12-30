import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'monitors:read')) {
      return errorResponse('Insufficient permissions. Required scope: monitors:read', 403);
    }

    const db = getD1Client();
    // Get only monitors belonging to this user
    const monitors = await db.queryAll(
      `SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC`,
      [auth.userId]
    );

    return successResponse(monitors);
  } catch (error: any) {
    console.error('Get monitors error:', error);
    return errorResponse(error.message || 'Failed to fetch monitors', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    // Check scope if using API token
    if (auth.scopes && !checkScope(auth.scopes, 'monitors:write')) {
      return errorResponse('Insufficient permissions. Required scope: monitors:write', 403);
    }

    const body = await request.json();
    const {
      name,
      url,
      urls,
      method,
      interval_sec,
      timeout_ms,
      expected_min,
      expected_max,
      keyword,
      headers_json,
      body: requestBody,
      recovery_period_sec,
      confirmation_period_sec,
    } = body;

    if (!url || !interval_sec || !timeout_ms) {
      return errorResponse('url, interval_sec, and timeout_ms are required');
    }

    // Default to GET if method not provided (backward compatibility)
    const monitorMethod = method || 'GET';

    const db = getD1Client();
    const monitorId = uuidv4();
    const now = Date.now();
    const nextRunAt = now + interval_sec * 1000;

    await db.execute(
      `INSERT INTO monitors (
        id, user_id, name, url, urls, method, interval_sec, timeout_ms,
        expected_min, expected_max, keyword, headers_json, body, is_active, next_run_at, created_at,
        recovery_period_sec, confirmation_period_sec
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        monitorId,
        auth.userId,
        name || null,
        url,
        urls || null,
        monitorMethod,
        interval_sec,
        timeout_ms,
        expected_min || null,
        expected_max || null,
        keyword || null,
        headers_json ? JSON.stringify(headers_json) : null,
        requestBody || null,
        nextRunAt,
        now,
        recovery_period_sec || null,
        confirmation_period_sec || null,
      ]
    );

    const monitor = await db.queryFirst(
      'SELECT * FROM monitors WHERE id = ?',
      [monitorId]
    );

    return successResponse(monitor, 201);
  } catch (error: any) {
    console.error('Create monitor error:', error);
    return errorResponse(error.message || 'Failed to create monitor', 500);
  }
}

