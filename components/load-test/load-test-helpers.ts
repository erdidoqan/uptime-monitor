/* ───────── Shared Types ───────── */

export interface RampStepResult {
  concurrentUsers: number;
  /** Gerçekte elde edilen eşzamanlı bağlantı sayısı */
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
  /** Canlı test sırasında dolu, DB'den gelen veride boş/undefined */
  latencies?: number[];
  errorReasons?: Record<string, number>;
}

export interface LoadTestReportData {
  totalSent: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  rps: number;
  /** Canlı test sırasında dolu, DB'den gelen veride undefined */
  latencies?: number[];
  errorReasons?: Record<string, number>;
  rampSteps: RampStepResult[];
  targetConcurrentUsers: number;
  stoppedReason?: "user" | "smart_stop" | string;
  regions?: string[];
  /** DB'den gelen genel p50/p95/p99 */
  p50?: number | null;
  p95?: number | null;
  p99?: number | null;
}

/* ───────── Helpers ───────── */

export const ERROR_REASON_LABELS: Record<string, string> = {
  http_429_rate_limit: "Rate limit (429)",
  http_503_unavailable: "Servis kullanılamıyor (503)",
  http_502_bad_gateway: "Bad gateway (502)",
  http_504_gateway_timeout: "Gateway timeout (504)",
  http_5xx_server_error: "Sunucu hatası (5xx)",
  timeout: "Zaman aşımı",
  connection_refused: "Bağlantı reddedildi",
  connection_reset: "Bağlantı sıfırlandı",
  connection_limit: "Cloudflare bağlantı limiti (6)",
  too_many_subrequests: "Cloudflare subrequest limiti (50/istek)",
  dns_failed: "DNS hatası",
  ssl_error: "SSL/TLS hatası",
  network_error: "Ağ hatası",
};

export function labelForReason(key: string): string {
  return ERROR_REASON_LABELS[key] ?? key.replace(/^http_/, "HTTP ").replace(/_/g, " ");
}

/** Bölge kodu → kısa etiket */
export const REGION_LABELS: Record<string, string> = {
  wnam: "B.Amerika",
  enam: "D.Amerika",
  sam: "G.Amerika",
  weur: "B.Avrupa",
  eeur: "D.Avrupa",
  apac: "Asya",
  oc: "Okyanusya",
  afr: "Afrika",
  me: "Orta Doğu",
};

export function regionLabel(code: string): string {
  return REGION_LABELS[code] ?? code;
}

/** Süreyi insanca göster: 23.7s, 1.2s, 980ms */
export function formatDuration(sec: number): string {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  return `${sec.toFixed(1)}s`;
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

export function mergeErrorReasons(
  sources: (Record<string, number> | undefined)[],
): Record<string, number> | undefined {
  const merged: Record<string, number> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [reason, count] of Object.entries(src)) {
      merged[reason] = (merged[reason] ?? 0) + count;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/* ───────── Analysis Helpers ───────── */

/** Adımda anlamlı veri var mı? (en az 1 başarılı yanıt ve latency verisi) */
export function isStepValid(s: RampStepResult): boolean {
  // DB'den gelen veride latencies olmaz, p95 > 0 kontrolü yaparız
  if (s.latencies && s.latencies.length > 0) {
    return s.ok > 0 && s.latencies.length > 0;
  }
  return s.ok > 0 && s.p95 > 0;
}

/** Hata nedenlerini kategorize et */
export function categorizeErrors(s: RampStepResult): {
  rateLimit: number;
  serverError: number;
  networkError: number;
  total: number;
} {
  if (!s.errorReasons || s.errors === 0) {
    return { rateLimit: 0, serverError: 0, networkError: 0, total: s.errors };
  }
  let rateLimit = 0;
  let serverError = 0;
  let networkError = 0;
  for (const [k, v] of Object.entries(s.errorReasons)) {
    if (k === "http_429_rate_limit") {
      rateLimit += v;
    } else if (
      k.startsWith("http_5") ||
      k === "timeout" ||
      k === "connection_refused" ||
      k === "connection_reset"
    ) {
      serverError += v;
    } else if (
      k === "network_error" ||
      k.startsWith("network_") ||
      k === "dns_failed" ||
      k === "ssl_error" ||
      k === "connection_limit" ||
      k === "too_many_subrequests"
    ) {
      networkError += v;
    } else {
      // Diğer HTTP hataları (4xx vb.) — genel hata
      networkError += v;
    }
  }
  return { rateLimit, serverError, networkError, total: s.errors };
}

/** Hataların baskın türünü döndür */
export function dominantErrorType(s: RampStepResult): "rate_limit" | "server" | "network" | "mixed" {
  const c = categorizeErrors(s);
  if (c.total === 0) return "mixed";
  if (c.rateLimit / c.total >= 0.5) return "rate_limit";
  if (c.serverError / c.total >= 0.4) return "server";
  if (c.networkError / c.total >= 0.4) return "network";
  // 503 + network birlikte = sunucu çökmesi
  if ((c.serverError + c.networkError) / c.total >= 0.6) return "server";
  return "mixed";
}

/** Hata nedenlerinin kısa özetini ver */
export function errorBreakdown(s: RampStepResult): string {
  const c = categorizeErrors(s);
  const parts: string[] = [];
  if (c.rateLimit > 0) parts.push(`${c.rateLimit} rate limit`);
  if (c.serverError > 0) parts.push(`${c.serverError} sunucu hatası`);
  if (c.networkError > 0) parts.push(`${c.networkError} ağ hatası`);
  return parts.join(", ");
}

export function getAnalysisMessages(rampSteps: RampStepResult[]): string[] {
  if (rampSteps.length === 0) return [];
  const messages: string[] = [];
  const validSteps = rampSteps.filter(isStepValid);

  // ── 1. Kapasite tespiti: son sağlam adım ──
  let lastHealthy: RampStepResult | null = null;
  for (const s of validSteps) {
    if (s.p95 < 1000 && s.errorRate < 0.05) {
      lastHealthy = s;
    }
  }

  // ── 2. İlk yavaşlama (p95 >= 500ms veya hata >= %5 ama < %30) ──
  const slowIdx = rampSteps.findIndex(
    (s) => isStepValid(s) && (s.p95 >= 1000 || (s.errorRate >= 0.05 && s.errorRate < 0.3)),
  );

  // ── 3. Ciddi hata (>= %30) ──
  const severeIdx = rampSteps.findIndex((s) => s.errorRate >= 0.3);

  // ── 4. Tam çökme (%100 hata veya 0 OK) ──
  const crashIdx = rampSteps.findIndex((s) => s.errorRate >= 0.95 || (s.sent > 0 && s.ok === 0));

  // ── Mesaj oluştur ──

  // Kapasite mesajı
  if (lastHealthy) {
    messages.push(
      `✅ Sunucu ${lastHealthy.concurrentUsers} eşzamanlı kullanıcıya kadar sağlıklı (p95: ${lastHealthy.p95}ms, RPS: ${lastHealthy.rps})`,
    );
  }

  // Yavaşlama mesajı
  if (slowIdx >= 0) {
    const s = rampSteps[slowIdx];
    const errType = dominantErrorType(s);
    if (s.errorRate >= 0.05) {
      if (errType === "rate_limit") {
        messages.push(
          `⚠️ ${s.concurrentUsers} kullanıcıda rate limit devreye girdi — isteklerin %${Math.round(s.errorRate * 100)}'i engellendi`,
        );
      } else {
        messages.push(
          `⚠️ ${s.concurrentUsers} kullanıcıda hatalar başladı — %${Math.round(s.errorRate * 100)} hata (${errorBreakdown(s)})`,
        );
      }
    } else {
      messages.push(
        `⚠️ ${s.concurrentUsers} kullanıcıda yanıt süreleri yükseldi — p95: ${s.p95}ms${s.rps > 0 ? `, RPS: ${s.rps}` : ""}`,
      );
    }
  }

  // Ciddi hata mesajı
  if (severeIdx >= 0) {
    const s = rampSteps[severeIdx];
    const errType = dominantErrorType(s);
    if (errType === "rate_limit") {
      messages.push(
        `🔵 ${s.concurrentUsers} kullanıcıda sunucu rate limit uyguluyor — isteklerin %${Math.round(s.errorRate * 100)}'i 429 ile engellendi. Sunucu kendini koruyor.`,
      );
    } else if (errType === "server" || errType === "network") {
      messages.push(
        `🔴 ${s.concurrentUsers} kullanıcıda sunucu zorlanıyor — %${Math.round(s.errorRate * 100)} hata (${errorBreakdown(s)})`,
      );
    } else {
      messages.push(
        `🟠 ${s.concurrentUsers} kullanıcıda yüksek hata oranı — %${Math.round(s.errorRate * 100)} (${errorBreakdown(s)})`,
      );
    }
  }

  // Tam çökme mesajı
  if (crashIdx >= 0) {
    const s = rampSteps[crashIdx];
    const errType = dominantErrorType(s);
    if (s.ok === 0 && s.sent > 0) {
      if (errType === "rate_limit") {
        messages.push(
          `🔵 ${s.concurrentUsers} kullanıcıda tüm istekler rate limit ile engellendi — sunucu hiçbir isteğe yanıt vermedi`,
        );
      } else {
        messages.push(
          `🔴 ${s.concurrentUsers} kullanıcıda sunucu tamamen yanıt vermeyi durdurdu — ${s.sent} isteğin hiçbiri başarılı olmadı (${errorBreakdown(s)})`,
        );
      }
    } else if (errType === "rate_limit") {
      messages.push(
        `🔵 ${s.concurrentUsers} kullanıcıda sunucu neredeyse tüm istekleri engelledi (%${Math.round(s.errorRate * 100)} rate limit)`,
      );
    }
    // Server/network crash zaten severeIdx'te yakalandı, tekrar etmesin
  }

  // ── Genel değerlendirme ──
  if (crashIdx >= 0 && lastHealthy) {
    const crashStep = rampSteps[crashIdx];
    messages.push(
      `📊 Sonuç: Bu sunucu yaklaşık ${lastHealthy.concurrentUsers} eşzamanlı kullanıcıyı karşılayabilir. ${crashStep.concurrentUsers} kullanıcıda kullanılamaz hale geliyor.`,
    );
  } else if (crashIdx >= 0 && !lastHealthy) {
    const crashStep = rampSteps[crashIdx];
    messages.push(
      `📊 Sonuç: Sunucu zaten ${rampSteps[0].concurrentUsers} eşzamanlı kullanıcıda bile zorlanıyor. ${crashStep.concurrentUsers} kullanıcıda tamamen çöküyor.`,
    );
  } else if (severeIdx >= 0 && lastHealthy) {
    messages.push(
      `📊 Sonuç: Bu sunucu güvenli şekilde ${lastHealthy.concurrentUsers} eşzamanlı kullanıcıyı kaldırabilir.`,
    );
  } else if (slowIdx >= 0 && lastHealthy) {
    const slowStep = rampSteps[slowIdx];
    messages.push(
      `📊 Sonuç: Sunucu ${lastHealthy.concurrentUsers} kullanıcıya kadar iyi, ${slowStep.concurrentUsers}+ kullanıcıda yavaşlıyor ama çökmüyor.`,
    );
  }

  // RPS uyarısı — çok düşükse
  if (validSteps.length > 0) {
    const maxRps = Math.max(...validSteps.map((s) => s.rps));
    if (maxRps > 0 && maxRps <= 5) {
      messages.push(
        `⚠️ Sunucunun maksimum işleme kapasitesi çok düşük: ~${maxRps} istek/saniye. Hosting planı veya sunucu yapılandırması yetersiz olabilir.`,
      );
    } else if (maxRps > 5 && maxRps <= 20) {
      messages.push(
        `💡 Sunucunun maksimum işleme kapasitesi: ~${maxRps} istek/saniye. Orta düzey trafik için yeterli, yoğun trafikte yetersiz kalabilir.`,
      );
    }
  }

  // Hiçbir mesaj yoksa
  if (messages.length === 0 && validSteps.length > 0) {
    const last = validSteps[validSteps.length - 1];
    messages.push(
      `✅ Sunucu tüm adımlarda sağlam kaldı — ${last.concurrentUsers} eşzamanlı kullanıcıya kadar test edildi (p95: ${last.p95}ms)`,
    );
  }
  if (messages.length === 0 && rampSteps.length > 0) {
    messages.push(
      "🔴 Hiçbir adımda başarılı yanıt alınamadı. URL veya sunucu durumunu kontrol edin.",
    );
  }

  return messages;
}
