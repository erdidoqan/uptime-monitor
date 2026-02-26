import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { getUserSubscription } from '@/lib/subscription';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string' || id.length < 10) {
      return errorResponse('Geçersiz test ID', 400);
    }

    let isPro = false;
    try {
      const auth = await authenticateRequest(request);
      if (auth?.userId) {
        if (auth.email === 'erdi.doqan@gmail.com') {
          isPro = true;
        } else {
          const subscription = await getUserSubscription(auth.userId);
          if (subscription && subscription.status === 'active') {
            isPro = true;
          }
        }
      }
    } catch {}

    const db = getD1Client();
    const row = await db.queryFirst<{
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
      p95_ttfb: number | null;
      p95_fcp: number | null;
      p95_lcp: number | null;
      avg_dom_complete: number | null;
      avg_page_load: number | null;
      total_resources: number | null;
      total_bytes: number | null;
      js_errors: number;
      error_reasons: string | null;
      ramp_steps: string | null;
      stopped_reason: string | null;
      ai_analysis: string | null;
      status: string;
      created_at: number;
      updated_at: number | null;
    }>(
      `SELECT * FROM browser_tests WHERE id = ?`,
      [id],
    );

    if (!row) {
      return errorResponse('Test bulunamadı', 404);
    }

    if (row.status === 'running') {
      const STALE_THRESHOLD_MS = 10 * 60 * 1000;
      if (Date.now() - row.created_at > STALE_THRESHOLD_MS) {
        try {
          await db.execute(
            `UPDATE browser_tests SET status = 'abandoned', updated_at = ? WHERE id = ? AND status = 'running'`,
            [Date.now(), row.id],
          );
          row.status = 'abandoned';
        } catch {}
      }
    }

    const parsedRampSteps = row.ramp_steps ? JSON.parse(row.ramp_steps) : [];
    const parsedErrorReasons = row.error_reasons ? JSON.parse(row.error_reasons) : null;

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
        locked: true,
      });
    }

    return successResponse({
      ...row,
      error_reasons: parsedErrorReasons,
      ramp_steps: parsedRampSteps,
      locked: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Detay alınamadı';
    console.error('[browser-test/[id]] Error:', message);
    return errorResponse('Test detayı alınamadı', 500);
  }
}
