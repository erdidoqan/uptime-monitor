import * as jose from 'jose';

const CONCURRENT = 6; // Cloudflare: max 6 simultaneous connections per invocation
/** Free: 50 subrequests. Uygulama test öncesi son URL'yi kullanıyor (redirect yok), 50 güvenli. */
const SUBREQUEST_LIMIT = 50;
/** p95 bu değeri (ms) aşarsa batch yarıda kesilir, serverOverloaded döner */
const SLOW_LATENCY_P95_MS = 5000;
/** Yavaşlık kontrolü için en az bu kadar yanıt */
const SLOW_CHECK_MIN_SAMPLES = 20;
/** In-memory batch tracker temizlik aralığı (ms) */
const TRACKER_CLEANUP_INTERVAL_MS = 60_000;
/** Tracker entry TTL (ms) — JWT süresi ile aynı: 5 dakika */
const TRACKER_ENTRY_TTL_MS = 5 * 60 * 1000;

/* ───────── Types ───────── */

interface Env {
  JWT_SECRET: string;
  LOAD_TEST_CANCEL?: KVNamespace;
  LOAD_TEST_DO?: DurableObjectNamespace;
}

interface JWTPayload {
  url: string;
  countPerBatch: number;
  maxBatches: number;
  maxConcurrency?: number;
  exp: number;
  runId?: string;
}

interface BatchResult {
  sent: number;
  ok: number;
  errors: number;
  latencies: number[];
  errorReasons: Record<string, number>;
  cancelled?: boolean;
  serverOverloaded?: boolean;
  regions?: string[];
}

/* ───────── Batch Tracker (best-effort, in-memory) ───────── */

interface TrackerEntry {
  count: number;
  maxBatches: number;
  expiresAt: number;
}

const batchTracker = new Map<string, TrackerEntry>();
let lastCleanup = Date.now();

function cleanupTracker() {
  const now = Date.now();
  if (now - lastCleanup < TRACKER_CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of batchTracker) {
    if (entry.expiresAt < now) batchTracker.delete(key);
  }
}

/**
 * Track batch count per runId. Returns false if maxBatches exceeded.
 * Best-effort: multiple isolates each have their own counter.
 */
function trackBatch(runId: string, maxBatches: number): { allowed: boolean; count: number } {
  cleanupTracker();
  const now = Date.now();
  const record = batchTracker.get(runId);
  if (!record) {
    batchTracker.set(runId, { count: 1, maxBatches, expiresAt: now + TRACKER_ENTRY_TTL_MS });
    return { allowed: true, count: 1 };
  }
  if (record.count >= record.maxBatches) {
    return { allowed: false, count: record.count };
  }
  record.count++;
  return { allowed: true, count: record.count };
}

/* ───────── Token Verification ───────── */

async function verifyLoadTestToken(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] });
  if (!payload.url || typeof payload.countPerBatch !== 'number' || typeof payload.maxBatches !== 'number') {
    throw new Error('Invalid token payload');
  }
  return payload as unknown as JWTPayload;
}

/* ───────── Error Classification ───────── */

function getErrorReason(res: Response | null, err: unknown): string {
  if (res) {
    const code = res.status;
    if (code === 429) return 'http_429_rate_limit';
    if (code === 503) return 'http_503_unavailable';
    if (code === 502) return 'http_502_bad_gateway';
    if (code === 504) return 'http_504_gateway_timeout';
    if (code >= 500) return `http_5xx_server_error`;
    if (code >= 400) return `http_${code}`;
    return `http_${code}`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('subrequest') || lower.includes('too many subrequests')) return 'too_many_subrequests';
  if (lower.includes('connection limit') || lower.includes('connectionlimit')) return 'connection_limit';
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (lower.includes('econnrefused') || lower.includes('connection refused')) return 'connection_refused';
  if (lower.includes('econnreset') || lower.includes('connection reset')) return 'connection_reset';
  if (lower.includes('enotfound') || lower.includes('getaddrinfo')) return 'dns_failed';
  if (lower.includes('certificate') || lower.includes('ssl') || lower.includes('tls')) return 'ssl_error';
  if (msg.length > 60) return 'network_error';
  return `network_${msg.replace(/\s+/g, '_').slice(0, 40)}`;
}

/* ───────── Percentile helpers ───────── */

function p95(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const i = (95 / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

/* ───────── Request Fingerprint Randomization ───────── */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
];

const ACCEPT_LANGUAGES = [
  'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'en-US,en;q=0.9',
  'tr-TR,tr;q=0.9',
  'en-GB,en;q=0.9,tr;q=0.8',
  'de-DE,de;q=0.9,en;q=0.7',
  'fr-FR,fr;q=0.9,en;q=0.7',
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomLang(): string {
  return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

/** Cache-busting query param ekle — CDN/cache katmanını atla */
function bustCache(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + '_t=' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 0-maxMs arası rastgele bekleme (burst detection azaltma) */
function jitter(maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * maxMs);
  if (ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}

/** Jitter max süresi (ms) */
const JITTER_MAX_MS = 40;

/* ───────── Batch Runner (Pool Pattern) ───────── */

/**
 * Pool pattern: her an tam olarak CONCURRENT (6) bağlantı açık tutar.
 * Biri bitince hemen yenisi başlar, arada 0 bağlantıya düşmez → sürekli yük.
 *
 * Her istek rastgele User-Agent, Accept-Language ve cache-busting param kullanır.
 * İstekler arasında küçük jitter eklenir (burst detection azaltma).
 */
async function runBatch(
  targetUrl: string,
  count: number,
  isCancelled?: () => Promise<boolean>
): Promise<BatchResult> {
  // İlk cancel kontrolü
  if (isCancelled && (await isCancelled())) {
    return { sent: 0, ok: 0, errors: 0, latencies: [], errorReasons: {}, cancelled: true };
  }

  const latencies: number[] = [];
  const errorReasons: Record<string, number> = {};
  let ok = 0;
  let errors = 0;
  let nextIdx = 0;
  let running = 0;
  let overloaded = false;

  function addErrorReason(reason: string) {
    errorReasons[reason] = (errorReasons[reason] ?? 0) + 1;
  }

  return new Promise((resolve) => {
    function done() {
      resolve({
        sent: latencies.length,
        ok,
        errors,
        latencies,
        errorReasons,
        serverOverloaded: overloaded || undefined,
      });
    }

    async function launchOne() {
      // Küçük jitter — burst detection'ı azalt
      if (nextIdx > CONCURRENT) {
        await jitter(JITTER_MAX_MS);
      }

      const url = bustCache(targetUrl);
      const start = Date.now();
      fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': randomLang(),
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        redirect: 'follow',
      })
        .then(async (res) => {
          const ms = Date.now() - start;
          try { if (res.body) await res.arrayBuffer(); } catch {}
          latencies.push(ms);
          if (res.status >= 200 && res.status < 400) {
            ok++;
          } else {
            errors++;
            addErrorReason(getErrorReason(res, null));
          }
        })
        .catch((e) => {
          const ms = Date.now() - start;
          latencies.push(ms);
          errors++;
          addErrorReason(getErrorReason(null, e));
        })
        .finally(() => {
          running--;
          // Yavaşlık kontrolü
          if (
            !overloaded &&
            latencies.length >= SLOW_CHECK_MIN_SAMPLES &&
            p95(latencies) >= SLOW_LATENCY_P95_MS
          ) {
            overloaded = true;
          }
          tryNext();
          if (running === 0 && nextIdx >= count) done();
        });
    }

    function tryNext() {
      // Overloaded ise yeni istek başlatma, çalışanlar bitsin
      if (overloaded) {
        if (running === 0) done();
        return;
      }

      while (running < CONCURRENT && nextIdx < count) {
        running++;
        nextIdx++;
        launchOne();
      }

      // Hiç başlatılacak kalmadı ve çalışan da yok
      if (running === 0 && nextIdx >= count) done();
    }

    tryNext();
  });
}

/* ───────── Multi-Region Durable Objects ───────── */

/**
 * 5 farklı kıta/bölge → 5 farklı Cloudflare colo → 5 farklı egress IP.
 * Her DO kendi bölgesinden fetch yapar = hedef sunucu farklı IP'ler görür.
 */
type LocationHint = 'wnam' | 'enam' | 'sam' | 'weur' | 'eeur' | 'apac' | 'oc' | 'afr' | 'me';

/**
 * Bölge katmanları — yakından uzağa sıralı.
 * Düşük count'larda sadece yakın bölgeler kullanılır (düşük stagger).
 * Yüksek count'larda uzak bölgeler de eklenir (IP çeşitliliği).
 *
 * Stagger: yakın bölge ~200ms, uzak bölge ~2000ms DO routing overhead.
 * Az bölge = düşük stagger = daha iyi eşzamanlılık.
 * Çok bölge = yüksek stagger AMA daha çok IP çeşitliliği.
 */
const REGION_TIERS: LocationHint[][] = [
  ['weur', 'eeur'],              // Tier 0: Avrupa (en yakın, ~100-200ms overhead)
  ['wnam', 'enam'],              // Tier 1: Kuzey Amerika (~300-500ms)
  ['apac', 'me'],                // Tier 2: Asya & Orta Doğu (~500-1000ms)
  ['sam', 'afr', 'oc'],          // Tier 3: Güney Amerika, Afrika, Okyanusya (~1000-2000ms)
];

/** Tüm bölgeler düz liste (tier sırasında) */
const ALL_REGIONS: LocationHint[] = REGION_TIERS.flat();

/**
 * Count'a göre kaç bölge kullanılacağını belirler.
 * - count ≤ 12: 2 bölge (Avrupa) — düşük stagger, doğru eşzamanlılık
 * - count ≤ 24: 4 bölge (+ K.Amerika)
 * - count ≤ 42: 6 bölge (+ Asya & Orta Doğu)
 * - count > 42: 9 bölge (tümü) — max IP çeşitliliği
 */
function selectRegions(count: number): LocationHint[] {
  if (count <= 12) return REGION_TIERS[0];
  if (count <= 24) return [...REGION_TIERS[0], ...REGION_TIERS[1]];
  if (count <= 42) return [...REGION_TIERS[0], ...REGION_TIERS[1], ...REGION_TIERS[2]];
  return ALL_REGIONS;
}

/** İstekleri bölgelere dağıt, paralel çalıştır, sonuçları birleştir */
async function runDistributedBatch(
  env: Env,
  targetUrl: string,
  count: number,
  runId: string,
): Promise<BatchResult> {
  const ns = env.LOAD_TEST_DO!;
  const regions = selectRegions(count);

  // İstek sayısını seçilen bölgelere eşit dağıt
  let remaining = count;
  const shares: { region: LocationHint; count: number }[] = [];
  for (let i = 0; i < regions.length && remaining > 0; i++) {
    const share = Math.ceil(remaining / (regions.length - i));
    shares.push({ region: regions[i], count: share });
    remaining -= share;
  }

  // Tüm bölgeleri paralel başlat
  const results = await Promise.allSettled(
    shares.map(async ({ region, count: c }) => {
      const id = ns.idFromName(`${runId}-${region}`);
      const stub = ns.get(id, { locationHint: region });
      const res = await stub.fetch('https://do-internal/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, count: c }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`DO ${region} HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return (await res.json()) as BatchResult;
    })
  );

  // Sonuçları birleştir
  const merged: BatchResult = {
    sent: 0,
    ok: 0,
    errors: 0,
    latencies: [],
    errorReasons: {},
    regions: [],
  };

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      (merged.regions as string[]).push(shares[i].region);
      merged.sent += r.value.sent;
      merged.ok += r.value.ok;
      merged.errors += r.value.errors;
      merged.latencies.push(...r.value.latencies);
      if (r.value.errorReasons) {
        for (const [k, c] of Object.entries(r.value.errorReasons)) {
          merged.errorReasons[k] = (merged.errorReasons[k] ?? 0) + (c as number);
        }
      }
      if (r.value.serverOverloaded) merged.serverOverloaded = true;
      if (r.value.cancelled) merged.cancelled = true;
    } else {
      // Bölge başarısız — kendi payını hata olarak say
      (merged.regions as string[]).push(shares[i].region + ':failed');
      merged.errors += shares[i].count;
      merged.errorReasons['do_region_error'] =
        (merged.errorReasons['do_region_error'] ?? 0) + shares[i].count;
    }
  }

  return merged;
}

/* ───────── Durable Object Class ───────── */

/**
 * LoadTestDO — Her bölgede bir tane oluşturulur (locationHint ile).
 * Kendi bölgesinin Cloudflare colo'sundan fetch yapar → farklı egress IP.
 */
export class LoadTestDO {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as { url: string; count: number };
      if (!body.url || typeof body.count !== 'number' || body.count < 1) {
        return new Response(
          JSON.stringify({ sent: 0, ok: 0, errors: 0, latencies: [], errorReasons: { invalid_request: 1 } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // DO'lar paid plan'da daha yüksek subrequest limitlerine sahip
      const result = await runBatch(body.url, body.count);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          sent: 0,
          ok: 0,
          errors: 1,
          latencies: [],
          errorReasons: { do_internal_error: 1 },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

/* ───────── CORS ───────── */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/* ───────── Worker Handler ───────── */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!env.JWT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured: JWT_SECRET not set' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    let payload: JWTPayload;
    try {
      payload = await verifyLoadTestToken(token, env.JWT_SECRET);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired token';
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', detail: msg }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // ── Cancel route ──
    if (url.pathname === '/load-test-cancel' && request.method === 'POST') {
      if (!env.LOAD_TEST_CANCEL || !payload.runId) {
        return new Response(
          JSON.stringify({ error: 'Cancel not configured or no runId' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }
      let body: { runId?: string };
      try {
        body = (await request.json()) as { runId?: string };
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }
      if (body.runId !== payload.runId) {
        return new Response(
          JSON.stringify({ error: 'runId mismatch' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }
      await env.LOAD_TEST_CANCEL.put(`cancel:${payload.runId}`, '1', { expirationTtl: 300 });
      return new Response(JSON.stringify({ ok: true, cancelled: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // ── Batch route ──
    if (url.pathname !== '/load-test-batch' || request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Not found', path: url.pathname }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    let body: { url?: string; count?: number };
    try {
      body = (await request.json()) as { url?: string; count?: number };
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    const targetUrl = body.url;
    const requestedCount = typeof body.count === 'number' ? body.count : 0;
    if (!targetUrl || targetUrl !== payload.url || requestedCount < 1 || requestedCount > payload.countPerBatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid url or count' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }
    const count = Math.min(requestedCount, SUBREQUEST_LIMIT);

    // ── maxBatches enforcement (best-effort, in-memory) ──
    if (payload.runId) {
      const track = trackBatch(payload.runId, payload.maxBatches);
      if (!track.allowed) {
        return new Response(
          JSON.stringify({ error: 'Batch limit exceeded', maxBatches: payload.maxBatches, used: track.count }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...CORS } }
        );
      }
    }

    // ── Cancel check ──
    const isCancelled =
      env.LOAD_TEST_CANCEL && payload.runId
        ? async () => (await env.LOAD_TEST_CANCEL!.get(`cancel:${payload.runId}`)) === '1'
        : undefined;

    if (isCancelled && (await isCancelled())) {
      return new Response(
        JSON.stringify({
          sent: 0,
          ok: 0,
          errors: 0,
          latencies: [],
          errorReasons: {},
          cancelled: true,
        }),
        { headers: { 'Content-Type': 'application/json', ...CORS } }
      );
    }

    // ── Run batch — Multi-region DO veya fallback ──
    let result: BatchResult;
    if (env.LOAD_TEST_DO && payload.runId) {
      // Multi-region: 5 farklı kıtadan farklı IP'lerle istek gönder
      result = await runDistributedBatch(env, targetUrl, count, payload.runId);
    } else {
      // Fallback: tek bölge (DO yoksa veya runId yoksa)
      result = await runBatch(targetUrl, count, isCancelled);
    }

    const sorted = [...result.latencies].sort((a, b) => a - b);
    const summary = {
      sent: result.sent,
      ok: result.ok,
      errors: result.errors,
      latencies: result.latencies,
      errorReasons: Object.keys(result.errorReasons).length > 0 ? result.errorReasons : undefined,
      cancelled: result.cancelled,
      serverOverloaded: result.serverOverloaded,
      regions: result.regions,
      summary:
        sorted.length > 0
          ? {
              min: sorted[0],
              max: sorted[sorted.length - 1],
              avg: Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
              p50: Math.round(percentile(sorted, 50)),
              p95: Math.round(percentile(sorted, 95)),
              p99: Math.round(percentile(sorted, 99)),
            }
          : null,
    };

    return new Response(JSON.stringify(summary), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  },
};
