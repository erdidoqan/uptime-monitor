import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { successResponse, errorResponse } from '@/lib/api-helpers';

/**
 * POST /api/load-test/abandon
 *
 * Kullanıcı sayfayı kapatırken (beforeunload) veya test yarıda kaldığında çağrılır.
 * sendBeacon ile kullanılabilmesi için minimal validasyon yapar.
 * Sadece "running" durumundaki testleri "abandoned" olarak işaretler.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const runId = body?.runId;

    if (!runId || typeof runId !== 'string') {
      return errorResponse('runId gerekli', 400);
    }

    const db = getD1Client();

    // Sadece "running" durumundaki testleri güncelle — tamamlanmış olanları etkileme
    await db.execute(
      `UPDATE load_tests SET status = 'abandoned', updated_at = ? WHERE id = ? AND status = 'running'`,
      [Date.now(), runId],
    );

    return successResponse({ abandoned: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Abandon işlemi başarısız';
    console.error('[load-test/abandon] Error:', message);
    return errorResponse('İşlem başarısız', 500);
  }
}
