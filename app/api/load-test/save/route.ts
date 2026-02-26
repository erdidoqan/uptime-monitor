import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';

/* ── Types ── */

interface RampStepPayload {
  concurrentUsers: number;
  actualConcurrency: number;
  sent: number;
  ok: number;
  errors: number;
  errorRate: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  durationSec: number;
  errorReasons?: Record<string, number>;
}

interface SavePayload {
  runId: string;
  totalRequests: number;
  totalSent: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  rps: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  errorReasons?: Record<string, number>;
  rampSteps: RampStepPayload[];
  stoppedReason?: 'user' | 'smart_stop';
  requestMode: 'auto' | 'manual';
  /** "completed" | "stopped" | "failed" */
  status?: string;
}

/* ── Handler ── */

export async function POST(request: NextRequest) {
  try {
    // Auth opsiyonel — guest testler de güncellenir
    await authenticateRequest(request);

    const body: SavePayload = await request.json();

    // Temel validasyon
    if (!body.runId || typeof body.runId !== 'string') {
      return errorResponse('runId gerekli', 400);
    }
    if (typeof body.totalSent !== 'number') {
      return errorResponse('totalSent geçersiz', 400);
    }

    // rampSteps'ten latencies dizisini çıkar (çok büyük, sadece p50/p95/p99 yeterli)
    const cleanSteps: RampStepPayload[] = Array.isArray(body.rampSteps)
      ? body.rampSteps.map((step) => ({
          concurrentUsers: step.concurrentUsers,
          actualConcurrency: step.actualConcurrency,
          sent: step.sent,
          ok: step.ok,
          errors: step.errors,
          errorRate: step.errorRate,
          rps: step.rps,
          p50: step.p50,
          p95: step.p95,
          p99: step.p99,
          durationSec: step.durationSec,
          errorReasons: step.errorReasons,
        }))
      : [];

    // Status belirle
    let status = body.status ?? 'completed';
    if (body.stoppedReason === 'user') status = 'stopped';
    else if (body.stoppedReason === 'smart_stop') status = 'smart_stopped';

    const now = Date.now();

    const db = getD1Client();
    await db.execute(
      `UPDATE load_tests SET
        total_requests = ?,
        total_sent = ?,
        total_ok = ?,
        total_errors = ?,
        duration_sec = ?,
        rps = ?,
        p50 = ?,
        p95 = ?,
        p99 = ?,
        error_reasons = ?,
        ramp_steps = ?,
        stopped_reason = ?,
        request_mode = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        body.totalRequests ?? body.totalSent,
        body.totalSent,
        body.totalOk ?? 0,
        body.totalErrors ?? 0,
        body.durationSec ?? 0,
        body.rps ?? 0,
        body.p50 ?? null,
        body.p95 ?? null,
        body.p99 ?? null,
        body.errorReasons ? JSON.stringify(body.errorReasons) : null,
        cleanSteps.length > 0 ? JSON.stringify(cleanSteps) : null,
        body.stoppedReason ?? null,
        body.requestMode ?? null,
        status,
        now,
        body.runId,
      ],
    );

    return successResponse({ id: body.runId, saved: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Kayıt başarısız';
    console.error('[load-test/save] Error:', message);
    return errorResponse('Test sonucu kaydedilemedi', 500);
  }
}
