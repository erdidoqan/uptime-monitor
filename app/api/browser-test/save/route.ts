import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

interface BrowserRampStepPayload {
  browsers: number;
  tabsPerBrowser: number;
  totalVisits: number;
  ok: number;
  errors: number;
  errorRate: number;
  durationSec: number;
  avgTtfb: number;
  avgFcp: number;
  avgLcp: number;
  avgCls: number;
  p95Ttfb: number;
  p95Fcp: number;
  p95Lcp: number;
  avgDomComplete: number;
  avgPageLoad: number;
  totalResources: number;
  totalBytes: number;
  jsErrors: number;
  errorReasons?: Record<string, number>;
}

interface SavePayload {
  runId: string;
  totalVisits: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  avgTtfb: number | null;
  avgFcp: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  p95Ttfb: number | null;
  p95Fcp: number | null;
  p95Lcp: number | null;
  avgDomComplete: number | null;
  avgPageLoad: number | null;
  totalResources: number | null;
  totalBytes: number | null;
  jsErrors: number;
  errorReasons?: Record<string, number>;
  rampSteps: BrowserRampStepPayload[];
  stoppedReason?: 'user' | 'smart_stop';
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    await authenticateRequest(request);

    const body: SavePayload = await request.json();

    if (!body.runId || typeof body.runId !== 'string') {
      return errorResponse('runId gerekli', 400);
    }

    const cleanSteps = Array.isArray(body.rampSteps)
      ? body.rampSteps.map((step) => ({
          browsers: step.browsers,
          tabsPerBrowser: step.tabsPerBrowser,
          totalVisits: step.totalVisits,
          ok: step.ok,
          errors: step.errors,
          errorRate: step.errorRate,
          durationSec: step.durationSec,
          avgTtfb: step.avgTtfb,
          avgFcp: step.avgFcp,
          avgLcp: step.avgLcp,
          avgCls: step.avgCls,
          p95Ttfb: step.p95Ttfb,
          p95Fcp: step.p95Fcp,
          p95Lcp: step.p95Lcp,
          avgDomComplete: step.avgDomComplete,
          avgPageLoad: step.avgPageLoad,
          totalResources: step.totalResources,
          totalBytes: step.totalBytes,
          jsErrors: step.jsErrors,
          errorReasons: step.errorReasons,
        }))
      : [];

    let status = body.status ?? 'completed';
    if (body.stoppedReason === 'user') status = 'stopped';
    else if (body.stoppedReason === 'smart_stop') status = 'smart_stopped';

    const db = getD1Client();
    await db.execute(
      `UPDATE browser_tests SET
        total_visits = ?,
        total_ok = ?,
        total_errors = ?,
        duration_sec = ?,
        avg_ttfb = ?,
        avg_fcp = ?,
        avg_lcp = ?,
        avg_cls = ?,
        p95_ttfb = ?,
        p95_fcp = ?,
        p95_lcp = ?,
        avg_dom_complete = ?,
        avg_page_load = ?,
        total_resources = ?,
        total_bytes = ?,
        js_errors = ?,
        error_reasons = ?,
        ramp_steps = ?,
        stopped_reason = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        body.totalVisits ?? 0,
        body.totalOk ?? 0,
        body.totalErrors ?? 0,
        body.durationSec ?? 0,
        body.avgTtfb ?? null,
        body.avgFcp ?? null,
        body.avgLcp ?? null,
        body.avgCls ?? null,
        body.p95Ttfb ?? null,
        body.p95Fcp ?? null,
        body.p95Lcp ?? null,
        body.avgDomComplete ?? null,
        body.avgPageLoad ?? null,
        body.totalResources ?? null,
        body.totalBytes ?? null,
        body.jsErrors ?? 0,
        body.errorReasons ? JSON.stringify(body.errorReasons) : null,
        cleanSteps.length > 0 ? JSON.stringify(cleanSteps) : null,
        body.stoppedReason ?? null,
        status,
        Date.now(),
        body.runId,
      ],
    );

    return successResponse({ id: body.runId, saved: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Kayıt başarısız';
    console.error('[browser-test/save] Error:', message);
    return errorResponse('Test sonucu kaydedilemedi', 500);
  }
}
