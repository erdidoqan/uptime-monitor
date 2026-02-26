import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { getUserSubscription } from '@/lib/subscription';

/**
 * Public GET endpoint — auth gerektirmez ancak Pro olmayan kullanıcılara
 * hassas alanlar (ai_analysis, detaylı ramp errorReasons) kısıtlanır.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length < 10) {
      return errorResponse('Geçersiz test ID', 400);
    }

    /* Kullanıcının Pro olup olmadığını belirle */
    let isPro = false;
    try {
      const auth = await authenticateRequest(request);
      if (auth?.userId) {
        // Admin her zaman Pro
        if (auth.email === 'erdi.doqan@gmail.com') {
          isPro = true;
        } else {
          const subscription = await getUserSubscription(auth.userId);
          if (subscription && subscription.status === 'active') {
            isPro = true;
          }
        }
      }
    } catch {
      // Auth hatası → Pro değil olarak devam
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
      ramp_steps: string | null;
      stopped_reason: string | null;
      request_mode: string | null;
      ai_analysis: string | null;
      seo_info: string | null;
      status: string;
      created_at: number;
      updated_at: number | null;
    }>(
      `SELECT id, url, target_url, target_concurrent_users,
              total_requests, total_sent, total_ok, total_errors,
              duration_sec, rps, p50, p95, p99,
              error_reasons, ramp_steps, stopped_reason,
              request_mode, ai_analysis, seo_info, status, created_at, updated_at
       FROM load_tests
       WHERE id = ?`,
      [id],
    );

    if (!row) {
      return errorResponse('Test bulunamadı', 404);
    }

    // Stale running test kontrolü — 5 dakikadan eski running → abandoned
    if (row.status === 'running') {
      const STALE_THRESHOLD_MS = 5 * 60 * 1000;
      if (Date.now() - row.created_at > STALE_THRESHOLD_MS) {
        try {
          await db.execute(
            `UPDATE load_tests SET status = 'abandoned', updated_at = ? WHERE id = ? AND status = 'running'`,
            [Date.now(), row.id],
          );
          row.status = 'abandoned';
        } catch {
          // DB hatası API yanıtını engellemesin
        }
      }
    }

    const parsedRampSteps = row.ramp_steps ? JSON.parse(row.ramp_steps) : [];
    const parsedErrorReasons = row.error_reasons ? JSON.parse(row.error_reasons) : null;
    const parsedSeoInfo = row.seo_info ? JSON.parse(row.seo_info) : null;

    /* Pro olmayan kullanıcılara hassas alanları kısıtla */
    if (!isPro) {
      const aiTeaser = row.ai_analysis
        ? row.ai_analysis.substring(0, 120) + '...'
        : null;

      const strippedSteps = parsedRampSteps.map((s: Record<string, unknown>) => {
        const { errorReasons: _er, ...rest } = s;
        return rest;
      });

      return successResponse({
        ...row,
        ai_analysis: aiTeaser,
        error_reasons: null,
        ramp_steps: strippedSteps,
        seo_info: parsedSeoInfo,
        locked: true,
      });
    }

    return successResponse({
      ...row,
      error_reasons: parsedErrorReasons,
      ramp_steps: parsedRampSteps,
      seo_info: parsedSeoInfo,
      locked: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Detay alınamadı';
    console.error('[load-test/[id]] Error:', message);
    return errorResponse('Test detayı alınamadı', 500);
  }
}
