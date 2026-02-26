import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { errorResponse, successResponse } from '@/lib/api-helpers';

interface BrowserStepData {
  browsers: number;
  totalVisits: number;
  ok: number;
  errors: number;
  errorRate: number;
  avgLcp: number;
  avgFcp: number;
  avgTtfb: number;
  avgCls: number;
  avgPageLoad: number;
  jsErrors: number;
  errorReasons?: Record<string, number>;
}

interface AnalyzePayload {
  runId: string;
  url: string;
  targetBrowsers: number;
  totalVisits: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  rampSteps: BrowserStepData[];
  errorReasons?: Record<string, number>;
}

const SYSTEM_PROMPT = `Sen kıdemli bir web performans ve Core Web Vitals uzmanısın. Gerçek browser testi sonuçlarını sade, anlaşılır ve somut şekilde yorumluyorsun.

Bu test gerçek Chromium browser'lar kullanarak yapıldı — HTTP isteği değil, gerçek kullanıcı deneyimi ölçüldü. Google Analytics'te de bu ziyaretler görünüyor.

FORMAT:

1. İLK PARAGRAF — ETKİLEYİCİ TEPKİ:
Core Web Vitals sonuçlarına göre duygusal tepki ver. Emojiler kullan.
- LCP < 2.5s ve CLS < 0.1: Çok iyi performans, coşkulu ol
- LCP 2.5-4s: Orta, dikkatli uyar
- LCP > 4s veya CLS > 0.25: Kötü, ciddi uyarı ver

2. WEB VITALS DEĞERLENDİRME (3-4 cümle):
Her metriği Google'ın eşik değerleriyle karşılaştır:
- LCP: <2.5s iyi, <4s orta, >4s kötü
- FCP: <1.8s iyi, <3s orta, >3s kötü
- CLS: <0.1 iyi, <0.25 orta, >0.25 kötü
- TTFB: <800ms iyi, <1800ms orta, >1800ms kötü

3. YÜK ALTINDA DAVRANIŞI (2-3 cümle):
Browser sayısı arttıkça Web Vitals nasıl değişti? Kırılma noktası var mı?

4. ÖNERİ (1-2 cümle): Somut, uygulanabilir öneri.

KURALLAR:
- Türkçe yaz
- Teknik jargon kullanma, sade dil kullan
- ms yerine saniye kullan (2500ms → 2.5 saniye)
- Her zaman rakam ver, belirsiz ifadeler kullanma
- Markdown formatı KULLANMA, düz metin yaz
- "Bu test gerçek browser kullandığı için Google Analytics'te de bu ziyaretler görünür" bilgisini hatırlat`;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzePayload = await request.json();

    if (!body.runId || !body.url || !Array.isArray(body.rampSteps)) {
      return errorResponse('runId, url ve rampSteps gerekli', 400);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return errorResponse('AI analiz şu an kullanılamıyor', 503);
    }

    const testData = {
      url: body.url,
      targetBrowsers: body.targetBrowsers,
      totalVisits: body.totalVisits,
      totalOk: body.totalOk,
      totalErrors: body.totalErrors,
      durationSec: Math.round(body.durationSec * 10) / 10,
      rampSteps: body.rampSteps.map((s) => ({
        browsers: s.browsers,
        visits: s.totalVisits,
        ok: s.ok,
        errors: s.errors,
        errorRatePercent: Math.round(s.errorRate * 100),
        lcpMs: s.avgLcp,
        fcpMs: s.avgFcp,
        ttfbMs: s.avgTtfb,
        clsScore: s.avgCls / 1000,
        pageLoadMs: s.avgPageLoad,
        jsErrors: s.jsErrors,
        ...(s.errorReasons && Object.keys(s.errorReasons).length > 0 ? { errorReasons: s.errorReasons } : {}),
      })),
      errorReasons: body.errorReasons ?? {},
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Şu gerçek browser testi sonuçlarını analiz et:\n\n${JSON.stringify(testData, null, 2)}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => 'unknown');
      console.error('[browser-test/analyze] OpenAI error:', openaiRes.status, errText);
      return errorResponse('AI analiz başarısız oldu', 502);
    }

    const openaiData = await openaiRes.json();
    const analysis: string = openaiData.choices?.[0]?.message?.content?.trim() ?? '';

    if (!analysis) {
      return errorResponse('AI boş yanıt döndü', 502);
    }

    try {
      const db = getD1Client();
      await db.execute(
        `UPDATE browser_tests SET ai_analysis = ?, updated_at = ? WHERE id = ?`,
        [analysis, Date.now(), body.runId],
      );
    } catch (dbErr) {
      console.error('[browser-test/analyze] D1 write error:', dbErr);
    }

    return successResponse({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI analiz başarısız';
    console.error('[browser-test/analyze] Error:', message);
    return errorResponse('AI analiz başarısız oldu', 500);
  }
}
