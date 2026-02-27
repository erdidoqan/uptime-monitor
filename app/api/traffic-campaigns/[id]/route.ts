import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
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
    if (!auth) return unauthorizedResponse();

    const { id } = await params;
    const db = getD1Client();

    const campaign = await db.queryFirst(
      'SELECT * FROM traffic_campaigns WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!campaign) {
      return errorResponse('Kampanya bulunamadı', 404);
    }

    const parsed = { ...campaign as Record<string, any> };
    if (parsed.url_pool && typeof parsed.url_pool === 'string') {
      try { parsed.url_pool = JSON.parse(parsed.url_pool); } catch { parsed.url_pool = null; }
    }

    return successResponse(parsed);
  } catch (error: any) {
    console.error('Get traffic campaign error:', error);
    return errorResponse(error.message || 'Failed to fetch campaign', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;
    const db = getD1Client();

    const existing = await db.queryFirst<{ id: string; daily_visitors: number; browsers_per_run: number; tabs_per_browser: number; start_hour: number; end_hour: number }>(
      'SELECT id, daily_visitors, browsers_per_run, tabs_per_browser, start_hour, end_hour FROM traffic_campaigns WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!existing) {
      return errorResponse('Kampanya bulunamadı', 404);
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.url !== undefined) {
      updates.push('url = ?');
      values.push(body.url);
    }
    if (body.daily_visitors !== undefined) {
      updates.push('daily_visitors = ?');
      values.push(body.daily_visitors);
    }
    if (body.traffic_source !== undefined) {
      updates.push('traffic_source = ?');
      values.push(body.traffic_source);
    }
    if (body.session_duration !== undefined) {
      updates.push('session_duration = ?');
      values.push(body.session_duration);
    }
    if (body.use_proxy !== undefined) {
      updates.push('use_proxy = ?');
      values.push(body.use_proxy ? 1 : 0);
    }
    if (body.start_hour !== undefined) {
      updates.push('start_hour = ?');
      values.push(body.start_hour);
    }
    if (body.end_hour !== undefined) {
      updates.push('end_hour = ?');
      values.push(body.end_hour);
    }
    if (body.url_pool !== undefined) {
      updates.push('url_pool = ?');
      values.push(Array.isArray(body.url_pool) && body.url_pool.length > 0
        ? JSON.stringify(body.url_pool)
        : null);
      updates.push('url_pool_updated_at = ?');
      values.push(Array.isArray(body.url_pool) && body.url_pool.length > 0 ? Date.now() : null);
    }

    if (body.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(body.is_active ? 1 : 0);
      updates.push('locked_at = ?');
      values.push(null);

      if (body.is_active) {
        const dv = body.daily_visitors ?? existing.daily_visitors;
        const vpr = existing.browsers_per_run * existing.tabs_per_browser;
        const sh = body.start_hour ?? existing.start_hour;
        const eh = body.end_hour ?? existing.end_hour;
        const runsPerDay = Math.max(1, Math.ceil(dv / vpr));
        const workingHours = eh - sh;
        const intervalMs = Math.floor((workingHours * 3600 * 1000) / runsPerDay);
        updates.push('next_run_at = ?');
        values.push(Date.now() + Math.min(intervalMs, 60_000));
      }
    }

    if (updates.length === 0) {
      return errorResponse('Güncellenecek alan yok');
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await db.execute(
      `UPDATE traffic_campaigns SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await db.queryFirst(
      'SELECT * FROM traffic_campaigns WHERE id = ?',
      [id]
    );

    return successResponse(updated);
  } catch (error: any) {
    console.error('Update traffic campaign error:', error);
    return errorResponse(error.message || 'Failed to update campaign', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;
    const db = getD1Client();

    const campaign = await db.queryFirst<{ id: string }>(
      'SELECT id FROM traffic_campaigns WHERE id = ? AND user_id = ?',
      [id, auth.userId]
    );

    if (!campaign) {
      return errorResponse('Kampanya bulunamadı', 404);
    }

    await db.execute('DELETE FROM traffic_campaigns WHERE id = ?', [id]);

    return successResponse({ success: true });
  } catch (error: any) {
    console.error('Delete traffic campaign error:', error);
    return errorResponse(error.message || 'Failed to delete campaign', 500);
  }
}
