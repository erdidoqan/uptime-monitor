import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  checkScope,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

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
    if (auth.scopes && !checkScope(auth.scopes, 'monitors:read')) {
      return errorResponse('Insufficient permissions. Required scope: monitors:read', 403);
    }

    const { id } = await params;
    const monitorId = id;
    const db = getD1Client();

    // Get monitor - only if it belongs to the user
    const monitorData = await db.queryFirst(
      'SELECT * FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, auth.userId]
    );

    if (!monitorData) {
      return errorResponse('Monitor not found', 404);
    }

    return successResponse(monitorData);
  } catch (error: any) {
    console.error('Get monitor error:', error);
    return errorResponse(error.message || 'Failed to fetch monitor', 500);
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
    if (auth.scopes && !checkScope(auth.scopes, 'monitors:write')) {
      return errorResponse('Insufficient permissions. Required scope: monitors:write', 403);
    }

    const { id } = await params;
    const monitorId = id;
    const db = getD1Client();

    // Check if monitor exists and belongs to this user
    const monitor = await db.queryFirst<{ id: string }>(
      'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, auth.userId]
    );

    if (!monitor) {
      return errorResponse('Monitor not found', 404);
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
      is_active,
      recovery_period_sec,
      confirmation_period_sec,
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
    if (urls !== undefined) {
      updates.push('urls = ?');
      values.push(urls || null);
    }
    if (method !== undefined) {
      updates.push('method = ?');
      values.push(method || 'GET');
    }
    if (interval_sec !== undefined) {
      updates.push('interval_sec = ?');
      values.push(interval_sec);
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
    if (headers_json !== undefined) {
      updates.push('headers_json = ?');
      values.push(headers_json ? JSON.stringify(headers_json) : null);
    }
    if (requestBody !== undefined) {
      updates.push('body = ?');
      values.push(requestBody || null);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
      
      // Always clear lock when changing active state (pause or resume)
      updates.push('locked_at = ?');
      values.push(null);
      
      // When reactivating a paused monitor, recalculate next_run_at
      if (is_active) {
        const current = await db.queryFirst<{
          interval_sec: number;
        }>('SELECT interval_sec FROM monitors WHERE id = ?', [monitorId]);
        
        if (current) {
          updates.push('next_run_at = ?');
          values.push(Date.now() + current.interval_sec * 1000);
        }
      }
    }
    if (recovery_period_sec !== undefined) {
      updates.push('recovery_period_sec = ?');
      values.push(recovery_period_sec || null);
    }
    if (confirmation_period_sec !== undefined) {
      updates.push('confirmation_period_sec = ?');
      values.push(confirmation_period_sec || null);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update');
    }

    values.push(monitorId);

    await db.execute(
      `UPDATE monitors SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await db.queryFirst(
      'SELECT * FROM monitors WHERE id = ?',
      [monitorId]
    );

    return successResponse(updated);
  } catch (error: any) {
    console.error('Update monitor error:', error);
    return errorResponse(error.message || 'Failed to update monitor', 500);
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
    if (auth.scopes && !checkScope(auth.scopes, 'monitors:write')) {
      return errorResponse('Insufficient permissions. Required scope: monitors:write', 403);
    }

    const { id } = await params;
    const monitorId = id;
    const db = getD1Client();

    // Check if monitor exists and belongs to this user
    const monitor = await db.queryFirst<{ id: string }>(
      'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
      [monitorId, auth.userId]
    );

    if (!monitor) {
      return errorResponse('Monitor not found', 404);
    }

    // Monitor checks are stored in R2, no need to delete from D1
    // R2 cleanup can be handled separately if needed

    // Delete monitor
    await db.execute('DELETE FROM monitors WHERE id = ?', [monitorId]);

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('Delete monitor error:', error);
    return errorResponse(error.message || 'Failed to delete monitor', 500);
  }
}

