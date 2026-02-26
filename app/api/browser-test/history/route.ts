import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const offset = (page - 1) * PAGE_SIZE;

    const db = getD1Client();

    const countRow = await db.queryFirst<{ total: number }>(
      'SELECT COUNT(*) as total FROM browser_tests WHERE user_id = ?',
      [auth.userId],
    );
    const total = countRow?.total ?? 0;

    const rows = await db.queryAll<{
      id: string;
      url: string;
      target_url: string;
      target_browsers: number;
      tabs_per_browser: number;
      total_visits: number;
      total_ok: number;
      total_errors: number;
      duration_sec: number;
      avg_ttfb: number | null;
      avg_fcp: number | null;
      avg_lcp: number | null;
      avg_cls: number | null;
      js_errors: number;
      stopped_reason: string | null;
      status: string;
      created_at: number;
      updated_at: number | null;
    }>(
      `SELECT id, url, target_url, target_browsers, tabs_per_browser,
              total_visits, total_ok, total_errors, duration_sec,
              avg_ttfb, avg_fcp, avg_lcp, avg_cls, js_errors,
              stopped_reason, status, created_at, updated_at
       FROM browser_tests
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [auth.userId, PAGE_SIZE, offset],
    );

    return successResponse({
      tests: rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Geçmiş alınamadı';
    console.error('[browser-test/history] Error:', message);
    return errorResponse('Test geçmişi alınamadı', 500);
  }
}
