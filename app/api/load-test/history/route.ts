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

    // Toplam kayıt sayısı
    const countRow = await db.queryFirst<{ total: number }>(
      'SELECT COUNT(*) as total FROM load_tests WHERE user_id = ?',
      [auth.userId],
    );
    const total = countRow?.total ?? 0;

    // Sayfalı sonuçlar (ramp_steps hariç — liste görünümünde ağır)
    const rows = await db.queryAll<{
      id: string;
      url: string;
      target_url: string;
      target_concurrent_users: number;
      total_requests: number;
      total_sent: number;
      total_ok: number;
      total_errors: number;
      duration_sec: number;
      rps: number;
      p50: number | null;
      p95: number | null;
      p99: number | null;
      stopped_reason: string | null;
      request_mode: string | null;
      status: string;
      created_at: number;
      updated_at: number | null;
    }>(
      `SELECT id, url, target_url, target_concurrent_users,
              total_requests, total_sent, total_ok, total_errors,
              duration_sec, rps, p50, p95, p99,
              stopped_reason, request_mode, status, created_at, updated_at
       FROM load_tests
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
    console.error('[load-test/history] Error:', message);
    return errorResponse('Test geçmişi alınamadı', 500);
  }
}

/**
 * Tekil test detayı (ramp_steps dahil)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    const body = await request.json() as { id?: string };
    if (!body.id || typeof body.id !== 'string') {
      return errorResponse('id gerekli', 400);
    }

    const db = getD1Client();
    const row = await db.queryFirst<{
      id: string;
      url: string;
      target_url: string;
      target_concurrent_users: number;
      total_requests: number;
      total_sent: number;
      total_ok: number;
      total_errors: number;
      duration_sec: number;
      rps: number;
      p50: number | null;
      p95: number | null;
      p99: number | null;
      error_reasons: string | null;
      ramp_steps: string;
      stopped_reason: string | null;
      request_mode: string | null;
      created_at: number;
    }>(
      'SELECT * FROM load_tests WHERE id = ? AND user_id = ?',
      [body.id, auth.userId],
    );

    if (!row) {
      return errorResponse('Test bulunamadı', 404);
    }

    return successResponse({
      ...row,
      error_reasons: row.error_reasons ? JSON.parse(row.error_reasons) : null,
      ramp_steps: JSON.parse(row.ramp_steps),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Detay alınamadı';
    console.error('[load-test/history] Detail error:', message);
    return errorResponse('Test detayı alınamadı', 500);
  }
}
