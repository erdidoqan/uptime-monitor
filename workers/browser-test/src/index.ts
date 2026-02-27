import puppeteer, { Browser } from '@cloudflare/puppeteer';
import * as jose from 'jose';

/* ───────── Constants ───────── */

const MAX_BROWSERS_PER_BATCH = 30;
const MAX_TABS_PER_BROWSER = 10;
const PAGE_TIMEOUT_MS = 30_000;
const PAGE_TIMEOUT_PROXY_MS = 60_000;
const TRACKER_CLEANUP_INTERVAL_MS = 60_000;
const TRACKER_ENTRY_TTL_MS = 10 * 60 * 1000;
const BROWSER_LAUNCH_RETRIES = 3;
const BROWSER_RETRY_DELAY_MS = 3000;
const LAUNCH_DELAY_MS = 1500;

/* ───────── Types ───────── */

interface Env {
  JWT_SECRET: string;
  BROWSER: Fetcher;
  PROXY_HOST?: string;
  PROXY_PORT?: string;
  PROXY_USER?: string;
  PROXY_PASS?: string;
  REGION?: string;
}

type TrafficSource = 'direct' | 'organic' | 'social';
type SessionDuration = 'fast' | 'realistic' | 'long';

const SESSION_DURATIONS: Record<SessionDuration, number> = {
  fast: 2000,
  realistic: 15000,
  long: 30000,
};

interface JWTPayload {
  url: string;
  maxBrowsers: number;
  maxTabs: number;
  maxBatches: number;
  exp: number;
  runId?: string;
  useProxy?: boolean;
  trafficSource?: TrafficSource;
  sessionDuration?: SessionDuration;
}

interface WebVitals {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  domInteractive: number;
  domComplete: number;
  pageLoad: number;
  totalResources: number;
  totalBytes: number;
  jsErrors: number;
}

interface TabResult {
  ok: boolean;
  vitals: WebVitals | null;
  error?: string;
  errorDetail?: string;
  durationMs: number;
}

/* ───────── Batch Tracker ───────── */

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

async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret);
  const { payload } = await jose.jwtVerify(token, key, { algorithms: ['HS256'] });
  if (!payload.url || typeof payload.maxBrowsers !== 'number' || typeof payload.maxTabs !== 'number') {
    throw new Error('Invalid token payload');
  }
  return payload as unknown as JWTPayload;
}

/* ───────── Percentile Helper ───────── */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/* ───────── Web Vitals Collection ───────── */

async function collectWebVitals(page: puppeteer.Page): Promise<WebVitals> {
  const vitals = await page.evaluate(() => {
    const result = {
      ttfb: 0, fcp: 0, lcp: 0, cls: 0,
      domInteractive: 0, domComplete: 0, pageLoad: 0,
      totalResources: 0, totalBytes: 0, jsErrors: 0,
    };

    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        result.ttfb = Math.round(nav.responseStart - nav.requestStart);
        result.domInteractive = Math.round(nav.domInteractive);
        result.domComplete = Math.round(nav.domComplete);
        result.pageLoad = Math.round(nav.loadEventEnd > 0 ? nav.loadEventEnd : nav.domComplete);
      }
    } catch {}

    try {
      const paints = performance.getEntriesByType('paint');
      for (const p of paints) {
        if (p.name === 'first-contentful-paint') {
          result.fcp = Math.round(p.startTime);
        }
      }
    } catch {}

    try {
      const resources = performance.getEntriesByType('resource');
      result.totalResources = resources.length;
      let totalBytes = 0;
      for (const r of resources) {
        totalBytes += (r as PerformanceResourceTiming).transferSize || 0;
      }
      result.totalBytes = totalBytes;
    } catch {}

    return result;
  });

  try {
    const lcpCls = await page.evaluate(() => {
      return new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcpVal = 0;
        let clsVal = 0;

        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              lcpVal = entries[entries.length - 1].startTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {}

        try {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsVal += (entry as any).value || 0;
              }
            }
          }).observe({ type: 'layout-shift', buffered: true });
        } catch {}

        setTimeout(() => {
          resolve({ lcp: Math.round(lcpVal), cls: Math.round(clsVal * 1000) });
        }, 300);
      });
    });
    vitals.lcp = lcpCls.lcp || vitals.fcp;
    vitals.cls = lcpCls.cls;
  } catch {
    vitals.lcp = vitals.fcp;
    vitals.cls = 0;
  }

  return vitals;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ───────── Error Classification ───────── */

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (lower.includes('navigation') || lower.includes('net::err_')) return 'navigation_error';
  if (lower.includes('ssl') || lower.includes('certificate')) return 'ssl_error';
  if (lower.includes('refused') || lower.includes('econnrefused')) return 'connection_refused';
  if (lower.includes('dns') || lower.includes('name not resolved')) return 'dns_failed';
  if (lower.includes('browser') || lower.includes('target closed')) return 'browser_crashed';
  if (lower.includes('limit') || lower.includes('429')) return 'rate_limit';
  return 'unknown_error';
}

/* ───────── Real User Simulation ───────── */

interface DeviceProfile {
  ua: string;
  width: number;
  height: number;
  dpr: number;
  mobile: boolean;
  platform: string;
  platformVersion: string;
  model: string;
  brands: { brand: string; version: string }[];
  fullVersionList: { brand: string; version: string }[];
}

const DEVICE_PROFILES: DeviceProfile[] = [
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.6312.52 Mobile/15E148 Safari/604.1',
    width: 390, height: 844, dpr: 3, mobile: true, platform: 'iOS', platformVersion: '17.4.0', model: 'iPhone',
    brands: [{ brand: 'Google Chrome', version: '123' }, { brand: 'Not:A-Brand', version: '8' }, { brand: 'Chromium', version: '123' }],
    fullVersionList: [{ brand: 'Google Chrome', version: '123.0.6312.52' }, { brand: 'Not:A-Brand', version: '8.0.0.0' }, { brand: 'Chromium', version: '123.0.6312.52' }],
  },
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    width: 375, height: 812, dpr: 3, mobile: true, platform: 'iOS', platformVersion: '17.3.1', model: 'iPhone',
    brands: [{ brand: 'Not A(Brand', version: '99' }, { brand: 'Apple WebKit', version: '605' }],
    fullVersionList: [{ brand: 'Not A(Brand', version: '99.0.0.0' }, { brand: 'Apple WebKit', version: '605.1.15' }],
  },
  {
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
    width: 360, height: 780, dpr: 3, mobile: true, platform: 'Android', platformVersion: '14.0.0', model: 'SM-S918B',
    brands: [{ brand: 'Google Chrome', version: '123' }, { brand: 'Not:A-Brand', version: '8' }, { brand: 'Chromium', version: '123' }],
    fullVersionList: [{ brand: 'Google Chrome', version: '123.0.6312.80' }, { brand: 'Not:A-Brand', version: '8.0.0.0' }, { brand: 'Chromium', version: '123.0.6312.80' }],
  },
  {
    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.80 Mobile Safari/537.36',
    width: 412, height: 892, dpr: 2.625, mobile: true, platform: 'Android', platformVersion: '14.0.0', model: 'Pixel 8 Pro',
    brands: [{ brand: 'Google Chrome', version: '123' }, { brand: 'Not:A-Brand', version: '8' }, { brand: 'Chromium', version: '123' }],
    fullVersionList: [{ brand: 'Google Chrome', version: '123.0.6312.80' }, { brand: 'Not:A-Brand', version: '8.0.0.0' }, { brand: 'Chromium', version: '123.0.6312.80' }],
  },
  {
    ua: 'Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36',
    width: 384, height: 854, dpr: 2.8125, mobile: true, platform: 'Android', platformVersion: '13.0.0', model: 'SM-A546B',
    brands: [{ brand: 'Chromium', version: '122' }, { brand: 'Not(A:Brand', version: '24' }, { brand: 'Google Chrome', version: '122' }],
    fullVersionList: [{ brand: 'Chromium', version: '122.0.6261.119' }, { brand: 'Not(A:Brand', version: '24.0.0.0' }, { brand: 'Google Chrome', version: '122.0.6261.119' }],
  },
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/305.0.622529620 Mobile/15E148 Safari/604.1',
    width: 393, height: 852, dpr: 3, mobile: true, platform: 'iOS', platformVersion: '17.4.0', model: 'iPhone',
    brands: [{ brand: 'Not A(Brand', version: '99' }],
    fullVersionList: [{ brand: 'Not A(Brand', version: '99.0.0.0' }],
  },
];

const LANGUAGES_TR = ['tr-TR,tr;q=0.9,en-US;q=0.8', 'en-US,en;q=0.9', 'tr-TR,tr;q=0.9'];
const LANGUAGES_US = ['en-US,en;q=0.9', 'en-US,en;q=0.9,es;q=0.8', 'en-GB,en;q=0.9,en-US;q=0.8'];

const SEARCH_REFERRERS = [
  { name: 'google',     url: 'https://www.google.com/search?q=' },
  { name: 'bing',       url: 'https://www.bing.com/search?q=' },
  { name: 'yahoo',      url: 'https://search.yahoo.com/search?p=' },
  { name: 'duckduckgo', url: 'https://duckduckgo.com/?q=' },
  { name: 'yandex',     url: 'https://yandex.com/search/?text=' },
];

const SOCIAL_REFERRERS = [
  { name: 'facebook',  url: 'https://www.facebook.com/' },
  { name: 'twitter',   url: 'https://t.co/' },
  { name: 'instagram', url: 'https://l.instagram.com/' },
  { name: 'linkedin',  url: 'https://www.linkedin.com/feed/' },
  { name: 'youtube',   url: 'https://www.youtube.com/' },
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface TrafficAttribution {
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

function buildAttribution(targetUrl: string, source: TrafficSource): TrafficAttribution {
  if (source === 'direct') {
    return { referrer: '', utmSource: '', utmMedium: '', utmCampaign: '' };
  }

  if (source === 'social') {
    const social = randomItem(SOCIAL_REFERRERS);
    return {
      referrer: social.url,
      utmSource: social.name,
      utmMedium: 'social',
      utmCampaign: 'social_share',
    };
  }

  const engine = randomItem(SEARCH_REFERRERS);
  let referrer: string;
  try {
    const hostname = new URL(targetUrl).hostname.replace('www.', '');
    referrer = engine.url + encodeURIComponent(hostname);
  } catch {
    referrer = engine.url + 'site';
  }
  return {
    referrer,
    utmSource: engine.name,
    utmMedium: 'organic',
    utmCampaign: '',
  };
}

function appendUtmParams(targetUrl: string, attr: TrafficAttribution): string {
  if (!attr.utmSource) return targetUrl;
  try {
    const u = new URL(targetUrl);
    u.searchParams.set('utm_source', attr.utmSource);
    u.searchParams.set('utm_medium', attr.utmMedium);
    if (attr.utmCampaign) u.searchParams.set('utm_campaign', attr.utmCampaign);
    return u.toString();
  } catch {
    return targetUrl;
  }
}

async function setupRealUserPage(page: puppeteer.Page, attr: TrafficAttribution, region?: string): Promise<void> {
  const device = randomItem(DEVICE_PROFILES);
  const langs = region === 'us' ? LANGUAGES_US : LANGUAGES_TR;
  const lang = randomItem(langs);

  await page.setUserAgent(device.ua, {
    architecture: device.platform === 'Android' ? 'arm' : '',
    bitness: device.platform === 'Android' ? '64' : '',
    brands: device.brands,
    fullVersionList: device.fullVersionList,
    mobile: device.mobile,
    model: device.model,
    platform: device.platform,
    platformVersion: device.platformVersion,
    wow64: false,
  });
  await page.setViewport({
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.dpr,
    isMobile: true,
    hasTouch: true,
  });

  const devJSON = JSON.stringify(device);
  await page.evaluateOnNewDocument((language: string, ref: string, utmSource: string, utmMedium: string, utmCampaign: string, deviceStr: string) => {
    const dev = JSON.parse(deviceStr) as any;
    /* ── CDP Runtime.Enable detection bypass ── */
    const origConsole = window.console;
    const noop = () => undefined;
    const handler: ProxyHandler<Console> = {
      get(target, prop, receiver) {
        if (['debug', 'log', 'info', 'warn', 'error', 'trace', 'dir', 'table', 'clear', 'count', 'countReset', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeLog', 'timeEnd', 'timeStamp', 'profile', 'profileEnd', 'assert'].includes(prop as string)) {
          return noop;
        }
        return Reflect.get(target, prop, receiver);
      },
    };
    try { window.console = new Proxy(origConsole, handler); } catch {}

    const OrigError = Error;
    const cleanStack = (stack: string | undefined) => {
      if (!stack) return stack;
      return stack.split('\n').filter((l: string) =>
        !l.includes('puppeteer') && !l.includes('__puppeteer') && !l.includes('Runtime.') && !l.includes('devtools')
      ).join('\n');
    };
    try {
      Object.defineProperty(OrigError.prototype, 'stack', {
        get() { return cleanStack((this as any).__originalStack); },
        set(v) { (this as any).__originalStack = v; },
        configurable: true,
      });
    } catch {}
    /* ── End CDP bypass ── */

    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        brands: dev.brands,
        mobile: dev.mobile,
        platform: dev.platform,
        getHighEntropyValues: () => Promise.resolve({
          architecture: dev.platform === 'Android' ? 'arm' : '',
          bitness: dev.platform === 'Android' ? '64' : '',
          brands: dev.brands,
          fullVersionList: dev.fullVersionList,
          mobile: dev.mobile,
          model: dev.model,
          platform: dev.platform,
          platformVersion: dev.platformVersion,
          wow64: false,
        }),
      }),
    });

    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
    Object.defineProperty(navigator, 'platform', {
      get: () => dev.platform === 'iOS' ? 'iPhone' : dev.platform === 'Android' ? 'Linux armv81' : 'Win32',
    });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

    Object.defineProperty(navigator, 'languages', {
      get: () => language.split(',').map((l: string) => l.split(';')[0].trim()),
    });

    if (ref) {
      Object.defineProperty(document, 'referrer', { get: () => ref });
    }

    (window as any).chrome = { runtime: {}, loadTimes: () => ({}) };

    const origQuery = (window as any).Permissions?.prototype?.query;
    if (origQuery) {
      (window as any).Permissions.prototype.query = (params: any) =>
        params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : origQuery(params);
    }

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtagConsent(...args: any[]) {
      (window as any).dataLayer.push(arguments);
    }
    gtagConsent('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  }, lang, attr.referrer, attr.utmSource, attr.utmMedium, attr.utmCampaign, devJSON);
}

/**
 * Simulate real user behavior for the configured duration.
 * Periodically scrolls and moves mouse to keep GA4 engagement alive.
 */
function randomizeDuration(baseMs: number): number {
  const variance = 0.4;
  const factor = 1 - variance + Math.random() * variance * 2;
  return Math.round(baseMs * factor);
}

async function simulateUserBehavior(page: puppeteer.Page, baseDurationMs: number): Promise<void> {
  try {
    const durationMs = randomizeDuration(baseDurationMs);
    const vp = page.viewport();
    const start = Date.now();
    const elapsed = () => Date.now() - start;

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = vp?.height ?? 800;
    const maxScroll = Math.max(0, pageHeight - viewportHeight);
    let scrollPos = 0;
    let reachedBottom = false;

    // Phase 1: Scroll down to 90%+ to trigger GA4 scroll event
    const target90 = Math.floor(maxScroll * 0.92);
    while (elapsed() < durationMs * 0.6 && scrollPos < target90) {
      const scrollAmount = 150 + Math.floor(Math.random() * 350);
      scrollPos = Math.min(scrollPos + scrollAmount, target90);

      await page.evaluate((pos: number) => {
        window.scrollTo({ top: pos, behavior: 'smooth' });
      }, scrollPos);

      if (vp) {
        const x = 50 + Math.floor(Math.random() * (vp.width - 100));
        const y = 50 + Math.floor(Math.random() * (vp.height - 100));
        await page.mouse.move(x, y, { steps: 3 + Math.floor(Math.random() * 5) });
      }

      const remaining = durationMs - elapsed();
      if (remaining <= 0) break;
      await delay(Math.min(remaining, 800 + Math.floor(Math.random() * 1500)));
    }

    if (scrollPos >= target90) reachedBottom = true;

    // Phase 2: Natural browsing - scroll up/down randomly
    let direction: 'down' | 'up' = 'up';
    while (elapsed() < durationMs) {
      if (direction === 'down') {
        scrollPos = Math.min(maxScroll, scrollPos + 80 + Math.floor(Math.random() * 400));
      } else {
        scrollPos = Math.max(0, scrollPos - 100 - Math.floor(Math.random() * 300));
      }

      await page.evaluate((pos: number) => {
        window.scrollTo({ top: pos, behavior: 'smooth' });
      }, scrollPos);

      if (vp) {
        const x = 50 + Math.floor(Math.random() * (vp.width - 100));
        const y = 50 + Math.floor(Math.random() * (vp.height - 100));
        await page.mouse.move(x, y, { steps: 3 + Math.floor(Math.random() * 5) });
      }

      if (Math.random() < 0.2) direction = direction === 'down' ? 'up' : 'down';

      const remaining = durationMs - elapsed();
      if (remaining <= 0) break;
      await delay(Math.min(remaining, 1000 + Math.floor(Math.random() * 3000)));
    }
  } catch {}
}

/* ───────── Single Tab Runner ───────── */

interface ProxyConfig {
  server: string;
  username: string;
  password: string;
}

const PROXY_SLOTS = 10;
let proxySlotCounter = 0;

function getProxyConfig(env: Env): ProxyConfig | null {
  if (!env.PROXY_HOST || !env.PROXY_PORT || !env.PROXY_USER || !env.PROXY_PASS) return null;
  const slot = (proxySlotCounter++ % PROXY_SLOTS) + 1;
  const baseUser = env.PROXY_USER.replace(/-\d+$/, '');
  return {
    server: `http://${env.PROXY_HOST}:${env.PROXY_PORT}`,
    username: `${baseUser}-${slot}`,
    password: env.PROXY_PASS,
  };
}

async function runTab(
  browser: Browser,
  targetUrl: string,
  proxy: ProxyConfig | null,
  trafficSource: TrafficSource,
  sessionDurationMs: number,
  region?: string,
): Promise<TabResult> {
  const start = Date.now();
  let context: puppeteer.BrowserContext | null = null;
  let page: puppeteer.Page | null = null;
  let jsErrorCount = 0;

  try {
    context = await browser.createBrowserContext(
      proxy ? { proxyServer: proxy.server } : undefined,
    );
    page = await context.newPage();

    if (proxy) {
      await page.authenticate({ username: proxy.username, password: proxy.password });
    }

    const attr = buildAttribution(targetUrl, trafficSource);
    await setupRealUserPage(page, attr, region);

    page.on('pageerror', () => { jsErrorCount++; });

    const navigateUrl = appendUtmParams(targetUrl, attr);
    const useProxyTimeout = !!proxy;
    await page.goto(navigateUrl, {
      waitUntil: useProxyTimeout ? 'networkidle2' : 'networkidle0',
      timeout: useProxyTimeout ? PAGE_TIMEOUT_PROXY_MS : PAGE_TIMEOUT_MS,
      referer: attr.referrer || undefined,
    });

    await simulateUserBehavior(page, sessionDurationMs);

    const vitals = await collectWebVitals(page);
    vitals.jsErrors = jsErrorCount;

    return {
      ok: true,
      vitals,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Tab error: ${errMsg}`);
    return {
      ok: false,
      vitals: null,
      error: classifyError(err),
      errorDetail: errMsg.slice(0, 200),
      durationMs: Date.now() - start,
    };
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
    if (context) {
      try { await context.close(); } catch {}
    }
  }
}

/* ───────── Streaming Batch Runner ───────── */

async function launchBrowserWithRetry(env: Env): Promise<Browser | null> {
  for (let attempt = 1; attempt <= BROWSER_LAUNCH_RETRIES; attempt++) {
    try {
      return await puppeteer.launch(env.BROWSER);
    } catch (err) {
      console.error(`Browser launch attempt ${attempt}/${BROWSER_LAUNCH_RETRIES} failed:`, err);
      if (attempt < BROWSER_LAUNCH_RETRIES) {
        await delay(BROWSER_RETRY_DELAY_MS * attempt);
      }
    }
  }
  return null;
}

interface StreamingOpts {
  env: Env;
  targetUrl: string;
  browserCount: number;
  tabsPerBrowser: number;
  shouldProxy: boolean;
  trafficSource: TrafficSource;
  sessionDurationMs: number;
  region?: string;
}

/**
 * Runs browsers one by one, streaming each tab result as NDJSON.
 * Lines: {"type":"browser",...}, {"type":"tab",...}, {"type":"done",...}
 */
async function runBrowserBatchStreaming(
  opts: StreamingOpts,
  writer: WritableStreamDefaultWriter<Uint8Array>,
): Promise<void> {
  const encoder = new TextEncoder();
  const write = (obj: Record<string, unknown>) => {
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'));
  };

  const vitals = {
    ttfb: [] as number[], fcp: [] as number[], lcp: [] as number[], cls: [] as number[],
    domInteractive: [] as number[], domComplete: [] as number[], pageLoad: [] as number[],
    totalResources: [] as number[], totalBytes: [] as number[],
  };
  const errorReasons: Record<string, number> = {};
  let totalOk = 0;
  let totalErrors = 0;
  let totalJsErrors = 0;

  for (let b = 0; b < opts.browserCount; b++) {
    write({ type: 'browser', idx: b + 1, total: opts.browserCount });

    const browser = await launchBrowserWithRetry(opts.env);
    if (!browser) {
      for (let t = 0; t < opts.tabsPerBrowser; t++) {
        totalErrors++;
        errorReasons['browser_launch_failed'] = (errorReasons['browser_launch_failed'] ?? 0) + 1;
        write({ type: 'tab', ok: false, error: 'browser_launch_failed', durationMs: 0 });
      }
      continue;
    }

    try {
      for (let t = 0; t < opts.tabsPerBrowser; t++) {
        const proxy = opts.shouldProxy ? getProxyConfig(opts.env) : null;
        const result = await runTab(
          browser, opts.targetUrl, proxy, opts.trafficSource, opts.sessionDurationMs, opts.region,
        );

        if (result.ok && result.vitals) {
          totalOk++;
          vitals.ttfb.push(result.vitals.ttfb);
          vitals.fcp.push(result.vitals.fcp);
          vitals.lcp.push(result.vitals.lcp);
          vitals.cls.push(result.vitals.cls);
          vitals.domInteractive.push(result.vitals.domInteractive);
          vitals.domComplete.push(result.vitals.domComplete);
          vitals.pageLoad.push(result.vitals.pageLoad);
          vitals.totalResources.push(result.vitals.totalResources);
          vitals.totalBytes.push(result.vitals.totalBytes);
          totalJsErrors += result.vitals.jsErrors;
        } else {
          totalErrors++;
          const reason = result.error ?? 'unknown_error';
          errorReasons[reason] = (errorReasons[reason] ?? 0) + 1;
        }

        write({
          type: 'tab',
          ok: result.ok,
          vitals: result.vitals,
          error: result.error ?? null,
          errorDetail: result.errorDetail ?? null,
          durationMs: result.durationMs,
        });
      }
    } finally {
      try { await browser.close(); } catch {}
    }

    if (b < opts.browserCount - 1) {
      await delay(LAUNCH_DELAY_MS);
    }
  }

  const sortedTtfb = [...vitals.ttfb].sort((a, b) => a - b);
  const sortedFcp = [...vitals.fcp].sort((a, b) => a - b);
  const sortedLcp = [...vitals.lcp].sort((a, b) => a - b);

  const summary = totalOk > 0 ? {
    avgTtfb: avg(vitals.ttfb),
    avgFcp: avg(vitals.fcp),
    avgLcp: avg(vitals.lcp),
    avgCls: avg(vitals.cls),
    avgDomComplete: avg(vitals.domComplete),
    avgPageLoad: avg(vitals.pageLoad),
    p95Ttfb: Math.round(percentile(sortedTtfb, 95)),
    p95Fcp: Math.round(percentile(sortedFcp, 95)),
    p95Lcp: Math.round(percentile(sortedLcp, 95)),
    totalResources: avg(vitals.totalResources),
    totalBytes: avg(vitals.totalBytes),
  } : null;

  write({
    type: 'done',
    totalVisits: totalOk + totalErrors,
    ok: totalOk,
    errors: totalErrors,
    browsersUsed: opts.browserCount,
    tabsPerBrowser: opts.tabsPerBrowser,
    jsErrors: totalJsErrors,
    errorReasons,
    summary,
    vitals,
  });
}

/* ───────── CORS ───────── */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/* ───────── Worker Handler ───────── */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    /* ── Debug: UTM live test — opens real browser & checks what GA4 sees ── */
    if (url.pathname === '/debug-utm' && request.method === 'POST') {
      let body: { url?: string; source?: string } = {};
      try { body = await request.json() as typeof body; } catch {}
      const testUrl = body.url || 'https://example.com/page';
      const source = (body.source || 'social') as TrafficSource;
      const customSource = (body as any).customSource as string | undefined;
      const customMedium = (body as any).customMedium as string | undefined;
      const customReferrer = (body as any).customReferrer as string | undefined;
      let attr = buildAttribution(testUrl, source);
      if (customSource) {
        attr = { referrer: customReferrer || '', utmSource: customSource, utmMedium: customMedium || 'referral', utmCampaign: '' };
      }
      const finalUrl = appendUtmParams(testUrl, attr);

      const useProxy = !!(body as any).useProxy;
      const proxyConfig = useProxy ? getProxyConfig(env) : null;

      let browser: Browser | null = null;
      try {
        browser = await puppeteer.launch(env.BROWSER);
        const context = proxyConfig
          ? await browser.createBrowserContext({ proxyServer: proxyConfig.server })
          : await browser.createBrowserContext();
        const page = await context.newPage();
        if (proxyConfig) {
          await page.authenticate({ username: proxyConfig.username, password: proxyConfig.password });
        }
        await setupRealUserPage(page, attr, env.REGION);

        const gaRequests: string[] = [];
        const collectParams: Record<string, string>[] = [];
        page.on('request', (req: any) => {
          const u = req.url() as string;
          if (u.includes('google-analytics.com') || u.includes('gtag') || u.includes('googletagmanager.com')) {
            gaRequests.push(u.substring(0, 300));
          }
          if (u.includes('/g/collect') || u.includes('/r/collect')) {
            try {
              const parsed = new URL(u);
              const params: Record<string, string> = {};
              parsed.searchParams.forEach((v, k) => { params[k] = v; });
              collectParams.push(params);
            } catch {}
          }
        });

        await page.goto(finalUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        const diagnostics = await page.evaluate(() => {
          return {
            finalUrl: window.location.href,
            search: window.location.search,
            referrer: document.referrer,
            hasGtag: typeof (window as any).gtag === 'function',
            hasDataLayer: Array.isArray((window as any).dataLayer),
            dataLayerLength: (window as any).dataLayer?.length ?? 0,
            dataLayerLast3: ((window as any).dataLayer ?? []).slice(-3).map((e: any) => {
              try { return JSON.stringify(e).substring(0, 200); } catch { return String(e); }
            }),
          };
        });

        await browser.close();
        browser = null;
        return jsonResponse({ attr, navigatedTo: finalUrl, diagnostics, gaRequestCount: gaRequests.length, gaRequests: gaRequests.slice(0, 5), collectParams });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResponse({ error: msg, attr, navigatedTo: finalUrl });
      } finally {
        if (browser) try { await browser.close(); } catch {}
      }
    }

    /* ── Debug: proxy test endpoint (no auth required) ── */
    if (url.pathname === '/debug-proxy' && request.method === 'POST') {
      const proxyConfig = getProxyConfig(env);
      if (!proxyConfig) {
        return jsonResponse({ error: 'Proxy not configured', hasHost: !!env.PROXY_HOST, hasPort: !!env.PROXY_PORT, hasUser: !!env.PROXY_USER, hasPass: !!env.PROXY_PASS });
      }
      let browser: Browser | null = null;
      try {
        browser = await puppeteer.launch(env.BROWSER);
        const context = await browser.createBrowserContext({ proxyServer: proxyConfig.server });
        const page = await context.newPage();
        await page.authenticate({ username: proxyConfig.username, password: proxyConfig.password });
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle2', timeout: 30000 });
        const text = await page.evaluate(() => document.body.innerText);
        await context.close();
        return jsonResponse({ ok: true, proxyServer: proxyConfig.server, username: proxyConfig.username, response: text });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonResponse({ ok: false, error: msg, proxyServer: proxyConfig.server, username: proxyConfig.username });
      } finally {
        if (browser) try { await browser.close(); } catch {}
      }
    }

    const auth = request.headers.get('Authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!env.JWT_SECRET) {
      return jsonResponse({ error: 'Server misconfigured: JWT_SECRET not set' }, 500);
    }
    if (!token) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    let payload: JWTPayload;
    try {
      payload = await verifyToken(token, env.JWT_SECRET);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid or expired token';
      return jsonResponse({ error: 'Invalid or expired token', detail: msg }, 401);
    }

    if (url.pathname !== '/browser-test-batch' || request.method !== 'POST') {
      return jsonResponse({ error: 'Not found', path: url.pathname }, 404);
    }

    let body: {
      url?: string;
      browsers?: number;
      tabsPerBrowser?: number;
      useProxy?: boolean;
      trafficSource?: string;
      sessionDuration?: string;
    };
    try {
      body = await request.json() as typeof body;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const targetUrl = body.url;
    const browsers = typeof body.browsers === 'number' ? body.browsers : 0;
    const tabs = typeof body.tabsPerBrowser === 'number' ? body.tabsPerBrowser : 5;
    const shouldProxy = !!(body.useProxy && payload.useProxy);

    const trafficSource: TrafficSource =
      (body.trafficSource === 'direct' || body.trafficSource === 'organic' || body.trafficSource === 'social')
        ? body.trafficSource
        : (payload.trafficSource ?? 'organic');

    const sessionDurationKey: SessionDuration =
      (body.sessionDuration === 'fast' || body.sessionDuration === 'realistic' || body.sessionDuration === 'long')
        ? body.sessionDuration
        : (payload.sessionDuration ?? 'fast');
    const sessionDurationMs = SESSION_DURATIONS[sessionDurationKey];

    if (!targetUrl || targetUrl !== payload.url) {
      return jsonResponse({ error: 'URL mismatch' }, 400);
    }
    if (browsers < 1 || browsers > Math.min(payload.maxBrowsers, MAX_BROWSERS_PER_BATCH)) {
      return jsonResponse({ error: 'Invalid browser count' }, 400);
    }
    if (tabs < 1 || tabs > Math.min(payload.maxTabs, MAX_TABS_PER_BROWSER)) {
      return jsonResponse({ error: 'Invalid tab count' }, 400);
    }

    if (payload.runId) {
      const track = trackBatch(payload.runId, payload.maxBatches);
      if (!track.allowed) {
        return jsonResponse(
          { error: 'Batch limit exceeded', maxBatches: payload.maxBatches, used: track.count },
          429,
        );
      }
    }

    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();

    const streamingOpts: StreamingOpts = {
      env, targetUrl, browserCount: browsers, tabsPerBrowser: tabs,
      shouldProxy, trafficSource, sessionDurationMs, region: env.REGION,
    };

    // Fire-and-forget: run in background, close writer when done
    (async () => {
      try {
        await runBrowserBatchStreaming(streamingOpts, writer);
      } catch (err) {
        const encoder = new TextEncoder();
        try {
          writer.write(encoder.encode(
            JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }) + '\n',
          ));
        } catch {}
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(readable, {
      headers: { 'Content-Type': 'application/x-ndjson', ...CORS },
    });
  },
};
