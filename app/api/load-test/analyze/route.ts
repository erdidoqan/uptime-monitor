import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { errorResponse, successResponse } from '@/lib/api-helpers';

/* ── Types ── */

interface RampStepData {
  concurrency: number;
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

interface AnalyzePayload {
  runId: string;
  url: string;
  targetConcurrentUsers: number;
  totalSent: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  rps: number;
  rampSteps: RampStepData[];
  errorReasons?: Record<string, number>;
}

/* ── System Prompt ── */

const SYSTEM_PROMPT = `Sen kıdemli bir performans mühendisisin. Yük testi sonuçlarını sade, anlaşılır ve somut şekilde yorumluyorsun. Teknik bilgisi olmayan biri bile okuduğunda sunucusunun durumunu anlayabilmeli.

FORMAT — Cevabın şu sırada olsun:

1. İLK PARAGRAF — ETKİLEYİCİ TEPKİ:
İlk paragrafta sitenin performansına ve test edilen eşzamanlı kullanıcı sayısına göre etkileyici, duygusal bir tepki ver. Emojiler kullan. Kullanıcı sayısı arttıkça ve performans iyi kaldıkça tepkin daha coşkulu olsun:

Örnekler (bunlara benzer ama aynısı değil, yaratıcı ol):
- 100 kullanıcı + iyi performans: "Siteniz 100 kişilik trafiği rahatça kaldırıyor 👍 Güzel bir başlangıç noktası."
- 100 kullanıcı + kötü performans: "Hmm, sadece 100 kişide bile zorlanma belirtileri var 😟 Bu ciddi bir durum."
- 500 kullanıcı + iyi performans: "500 kişi aynı anda girmiş ve siteniz hiç terlememiş! 💪 Sağlam bir altyapınız var."
- 500 kullanıcı + kötü performans: "500 kişide ciddi sıkıntılar başlıyor 😰 Bu trafiğe hazırlıklı olmanız lazım."
- 1000 kullanıcı + çok iyi performans: "1.000 kişi aynı anda ve site hâlâ tertemiz çalışıyor! 🚀🔥 Bu gerçekten etkileyici bir performans!"
- 1000 kullanıcı + orta performans: "1.000 kişide yavaşlamalar başlıyor ama site ayakta 💪 Optimize edilmesi gereken noktalar var."
- 2000 kullanıcı + iyi performans: "2.000 eşzamanlı kullanıcı ve hâlâ sapasağlam! 🏆🚀✨ Sunucunuz bir tank gibi, tebrikler!"
- 3000+ kullanıcı + iyi performans: "Bu inanılmaz! 🤯🎉🏆 Binlerce kişi aynı anda giriyor ve siteniz göz bile kırpmıyor. Altyapınız profesyonel seviyede!"
- 5000+ kullanıcı + iyi performans: "Efsanevi! 👑🚀🔥🏆 Bu ölçekte bu performansı görmek çok nadir. Siteniz kurşun geçirmez!"

Performans kötüyse tepkini buna göre ayarla — endişeli, uyarıcı ama yapıcı ol.

2. GENEL DURUM (2-3 cümle): Toplam gönderilen istek, başarı oranı, test süresi özetle.

3. KIRILMA NOKTASI: Sitenin performansının düşmeye başladığı anı belirle. "X kişi aynı anda girdiğinde herkes ortalama Y saniye beklemeye başlıyor" gibi.

4. ÖNERİ (1-2 cümle): Sonuca göre somut öneri.

KURALLAR:
- Türkçe yaz
- p50, p95, RPS gibi teknik terimler KULLANMA. "ortalama bekleme", "saniyede sayfa sayısı" gibi sade ifadeler kullan
- Rakamları ms yerine saniye cinsinden yaz (3036ms → 3 saniye)
- "Yüksek", "düşük", "sorunsuz" gibi belirsiz kelimeler KULLANMA — her zaman rakam ver
- Markdown formatı (**, ##, - listeler) KULLANMA, düz metin yaz
- Teknik jargon KULLANMA, herkesin anlayacağı dilde yaz
- Verideki her adımı incele ama hepsini listeleme, önemli kırılma noktalarını seç
- İlk paragraftaki tepki samimi, doğal ve eğlenceli olsun — reklam metni gibi olmasın`;

/* ── Handler ── */

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzePayload = await request.json();

    // Temel validasyon
    if (!body.runId || !body.url || !Array.isArray(body.rampSteps)) {
      return errorResponse('runId, url ve rampSteps gerekli', 400);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[load-test/analyze] OPENAI_API_KEY not configured');
      return errorResponse('AI analiz şu an kullanılamıyor', 503);
    }

    // LLM'e gönderilecek özet veriyi hazırla
    const testData = {
      url: body.url,
      targetConcurrentUsers: body.targetConcurrentUsers,
      totalSent: body.totalSent,
      totalOk: body.totalOk,
      totalErrors: body.totalErrors,
      durationSec: Math.round(body.durationSec * 10) / 10,
      overallRps: body.rps,
      rampSteps: body.rampSteps.map((s) => {
        const step: Record<string, unknown> = {
          concurrency: s.concurrency,
          sent: s.sent,
          ok: s.ok,
          errors: s.errors,
          errorRatePercent: Math.round(s.errorRate * 100),
          rps: s.rps,
          p50ms: s.p50,
          p95ms: s.p95,
          p99ms: s.p99,
          durationSec: Math.round(s.durationSec * 10) / 10,
        };
        // Adım bazlı hata nedenleri varsa ekle
        if (s.errorReasons && Object.keys(s.errorReasons).length > 0) {
          step.errorReasons = s.errorReasons;
        }
        return step;
      }),
      errorReasons: body.errorReasons ?? {},
    };

    // OpenAI API çağrısı (direkt fetch — ek paket yok)
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
            content: `Şu yük testi sonuçlarını analiz et:\n\n${JSON.stringify(testData, null, 2)}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => 'unknown');
      console.error('[load-test/analyze] OpenAI API error:', openaiRes.status, errText);
      return errorResponse('AI analiz başarısız oldu', 502);
    }

    const openaiData = await openaiRes.json();
    const analysis: string =
      openaiData.choices?.[0]?.message?.content?.trim() ?? '';

    if (!analysis) {
      return errorResponse('AI boş yanıt döndü', 502);
    }

    // D1'e yaz (fire-and-forget değil, ama hata olursa yine de analizi dön)
    try {
      const db = getD1Client();
      await db.execute(
        `UPDATE load_tests SET ai_analysis = ?, updated_at = ? WHERE id = ?`,
        [analysis, Date.now(), body.runId],
      );
    } catch (dbErr) {
      console.error('[load-test/analyze] D1 write error:', dbErr);
      // DB yazılamasa bile analizi kullanıcıya dön
    }

    return successResponse({ analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI analiz başarısız';
    console.error('[load-test/analyze] Error:', message);
    return errorResponse('AI analiz başarısız oldu', 500);
  }
}
