/**
 * Load test öncesi URL analizi: yönlendirme, son URL, aynı site kontrolü.
 * Worker'a son URL verilerek redirect subrequest'leri önlenir.
 */

const MAX_REDIRECTS = 10;
const PROBE_TIMEOUT_MS = 15_000;

export interface SeoInfo {
  hasSitemap: boolean;
  sitemapUrl?: string;
  sitemapUrlCount?: number;
  hasRobotsTxt: boolean;
  robotsAllowsCrawl?: boolean;
  sitemapFromRobots?: string;
  cms?: string;
}

export interface UrlAnalysis {
  /** Kullanıcının girdiği URL */
  originalUrl: string;
  /** Yönlendirmeler sonrası nihai URL (test buna yapılacak) */
  finalUrl: string;
  /** Yönlendirme sayısı (0 = yönlendirme yok) */
  redirectCount: number;
  /** Nihai yanıtın HTTP status kodu */
  status: number;
  /** Nihai yanıt 2xx/3xx mi */
  ok: boolean;
  /** Aynı site mi (farklı domaine yönlendirme varsa false) */
  sameSite: boolean;
  /** Hata mesajı (analiz başarısızsa) */
  error?: string;
  /** Serverless/CDN platform tespit edildiyse uyarı bilgisi */
  serverlessWarning?: { platform: string; message: string };
  /** SEO sağlık bilgisi (sitemap, robots.txt) */
  seoInfo?: SeoInfo;
}

/* ── Serverless / CDN platform tespiti ── */

/** Domain pattern'ından serverless tespit */
const SERVERLESS_DOMAIN_PATTERNS: Array<{ pattern: string; platform: string }> = [
  { pattern: '.vercel.app', platform: 'Vercel' },
  { pattern: '.netlify.app', platform: 'Netlify' },
  { pattern: '.netlify.com', platform: 'Netlify' },
  { pattern: '.workers.dev', platform: 'Cloudflare Workers' },
  { pattern: '.pages.dev', platform: 'Cloudflare Pages' },
  { pattern: '.herokuapp.com', platform: 'Heroku' },
  { pattern: '.fly.dev', platform: 'Fly.io' },
  { pattern: '.railway.app', platform: 'Railway' },
  { pattern: '.render.com', platform: 'Render' },
  { pattern: '.onrender.com', platform: 'Render' },
  { pattern: '.web.app', platform: 'Firebase Hosting' },
  { pattern: '.firebaseapp.com', platform: 'Firebase Hosting' },
  { pattern: '.appspot.com', platform: 'Google App Engine' },
  { pattern: '.run.app', platform: 'Google Cloud Run' },
  { pattern: '.cloudfunctions.net', platform: 'Google Cloud Functions' },
  { pattern: '.amplifyapp.com', platform: 'AWS Amplify' },
  { pattern: '.execute-api.', platform: 'AWS API Gateway' },
  { pattern: '.lambda-url.', platform: 'AWS Lambda' },
  { pattern: '.edgecompute.app', platform: 'Fastly Compute' },
  { pattern: '.deno.dev', platform: 'Deno Deploy' },
  { pattern: '.val.run', platform: 'Val Town' },
  { pattern: '.repl.co', platform: 'Replit' },
  { pattern: '.glitch.me', platform: 'Glitch' },
  { pattern: '.surge.sh', platform: 'Surge' },
  { pattern: '.github.io', platform: 'GitHub Pages' },
  { pattern: '.gitlab.io', platform: 'GitLab Pages' },
  { pattern: '.mybluemix.net', platform: 'IBM Cloud' },
  { pattern: '.streamlit.app', platform: 'Streamlit Cloud' },
  { pattern: '.up.railway.app', platform: 'Railway' },
];

/** Response header'larından serverless tespit */
function detectServerlessFromHeaders(headers: Headers): string | null {
  const server = headers.get('server')?.toLowerCase() ?? '';

  // Cloudflare: server=cloudflare header'ı hem CDN proxy hem Workers/Pages'de geliyor
  // Güvenilir şekilde ayırt etmek mümkün değil, yanlış pozitif riski yüksek → atla
  if (server === 'cloudflare') return null;

  // Vercel
  if (headers.get('x-vercel-id') || headers.get('x-vercel-cache')) return 'Vercel';

  // Netlify
  if (headers.get('x-nf-request-id') || server.includes('netlify')) return 'Netlify';

  // AWS (Lambda, CloudFront, API Gateway)
  if (headers.get('x-amzn-requestid') || headers.get('x-amz-cf-id')) return 'AWS';
  if (server.includes('amazons3')) return 'AWS S3';

  // Google Cloud / Firebase
  if (headers.get('x-cloud-trace-context') || server.includes('google frontend')) return 'Google Cloud';
  if (headers.get('x-firebase-hosting-version')) return 'Firebase';

  // Fly.io
  if (headers.get('fly-request-id') || server.includes('fly.io')) return 'Fly.io';

  // Railway
  if (headers.get('x-railway-request-id')) return 'Railway';

  // Render
  if (headers.get('x-render-origin-server')) return 'Render';

  // Heroku
  if (headers.get('x-request-id') && headers.get('via')?.includes('vegur')) return 'Heroku';

  // Fastly
  if (headers.get('x-served-by') && headers.get('x-cache') && server.includes('fastly')) return 'Fastly';

  // Akamai
  if (headers.get('x-akamai-transformed') || server.includes('akamaighost')) return 'Akamai CDN';

  return null;
}

/** Domain pattern + header'lardan serverless platform tespit et */
function detectServerlessPlatform(hostname: string, headers: Headers): string | null {
  const hn = hostname.toLowerCase();

  // Domain pattern kontrolü
  for (const { pattern, platform } of SERVERLESS_DOMAIN_PATTERNS) {
    if (hn.endsWith(pattern)) return platform;
  }

  // Header kontrolü (custom domain arkasında serverless olabilir)
  return detectServerlessFromHeaders(headers);
}

function buildServerlessWarning(platform: string): { platform: string; message: string } {
  return {
    platform,
    message: `Bu site ${platform} altyapısı üzerinde çalışıyor. Serverless/CDN platformları otomatik ölçeklenir ve rate limit uygular. Yük testi bu platformun limitlerini test eder, sitenizin gerçek performansını değil. Test hakkınızı boşa harcayabilirsiniz.`,
  };
}

/**
 * İki hostname aynı site kabul edilir mi?
 * - Aynı hostname
 * - Biri diğerinin www'lu hali (www.digitexa.com <-> digitexa.com)
 * - Aynı kök domain (eTLD+1) basit kontrolü
 */
function isSameSite(originalHost: string, finalHost: string): boolean {
  const o = originalHost.toLowerCase();
  const f = finalHost.toLowerCase();
  if (o === f) return true;
  if (f === 'www.' + o || o === 'www.' + f) return true;
  // Kök domain: www.digitexa.com -> digitexa.com, sub.foo.com -> foo.com (basit)
  const root = (h: string) => {
    if (h.startsWith('www.')) return h.slice(4);
    const parts = h.split('.');
    if (parts.length >= 2) return parts.slice(-2).join('.');
    return h;
  };
  return root(o) === root(f);
}

/* ── SEO Sağlık Kontrolü ── */

const SEO_TIMEOUT_MS = 5_000;

const SITEMAP_PATHS = [
  '/sitemap.xml',
  '/wp-sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap1.xml',
  '/post-sitemap.xml',
  '/page-sitemap.xml',
];

const MAX_SITEMAP_BYTES = 512 * 1024; // 500KB

function detectCmsFromSitemap(sitemapUrl: string, body: string): string | undefined {
  if (sitemapUrl.includes('wp-sitemap') || body.includes('wp-sitemap')) return 'WordPress';
  if (body.includes('shopify.com') || body.includes('/collections/') && body.includes('/products/')) return 'Shopify';
  if (body.includes('squarespace.com')) return 'Squarespace';
  if (body.includes('wix.com') || body.includes('wixsite.com')) return 'Wix';
  if (body.includes('blogger.com') || body.includes('blogspot.com')) return 'Blogger';
  if (body.includes('joomla')) return 'Joomla';
  if (body.includes('drupal')) return 'Drupal';
  return undefined;
}

function countSitemapUrls(xml: string): number {
  const urlMatches = xml.match(/<url[\s>]/gi);
  const sitemapMatches = xml.match(/<sitemap[\s>]/gi);
  const urlCount = urlMatches ? urlMatches.length : 0;
  const sitemapCount = sitemapMatches ? sitemapMatches.length : 0;
  return urlCount > 0 ? urlCount : sitemapCount;
}

function parseRobotsTxt(body: string): { allowsCrawl: boolean; sitemapUrl?: string } {
  const lines = body.split('\n');
  let sitemapUrl: string | undefined;
  let inGooglebotBlock = false;
  let globalDisallowAll = false;
  let googlebotDisallowAll = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Sitemap: satırı (her zaman global)
    const sitemapMatch = line.match(/^Sitemap:\s*(.+)/i);
    if (sitemapMatch && !sitemapUrl) {
      sitemapUrl = sitemapMatch[1].trim();
    }

    // User-agent bloğu
    const uaMatch = line.match(/^User-agent:\s*(.+)/i);
    if (uaMatch) {
      const ua = uaMatch[1].trim().toLowerCase();
      inGooglebotBlock = ua === 'googlebot' || ua === '*';
    }

    // Disallow kontrolü
    if (inGooglebotBlock) {
      const disallowMatch = line.match(/^Disallow:\s*(.+)/i);
      if (disallowMatch) {
        const path = disallowMatch[1].trim();
        if (path === '/') {
          const uaLine = lines.find(l => l.trim().match(/^User-agent:\s*(.+)/i));
          if (uaLine?.toLowerCase().includes('googlebot')) {
            googlebotDisallowAll = true;
          } else {
            globalDisallowAll = true;
          }
        }
      }
    }
  }

  const allowsCrawl = !googlebotDisallowAll && !globalDisallowAll;
  return { allowsCrawl, sitemapUrl };
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'UptimeTR-SEO-Check/1.0',
        Accept: 'text/xml,application/xml,text/plain,*/*',
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Sitenin SEO sağlığını kontrol eder: sitemap.xml, robots.txt
 */
export async function checkSeoHealth(finalUrl: string): Promise<SeoInfo> {
  const result: SeoInfo = {
    hasSitemap: false,
    hasRobotsTxt: false,
  };

  let origin: string;
  try {
    origin = new URL(finalUrl).origin;
  } catch {
    return result;
  }

  // robots.txt ve sitemap kontrollerini paralel başlat
  const robotsPromise = (async () => {
    try {
      const res = await fetchWithTimeout(`${origin}/robots.txt`, SEO_TIMEOUT_MS);
      if (res.ok) {
        const body = await res.text();
        if (body.length > 10 && body.toLowerCase().includes('user-agent')) {
          result.hasRobotsTxt = true;
          const parsed = parseRobotsTxt(body);
          result.robotsAllowsCrawl = parsed.allowsCrawl;
          if (parsed.sitemapUrl) {
            result.sitemapFromRobots = parsed.sitemapUrl;
          }
        }
      }
    } catch {
      // robots.txt erişilemedi
    }
  })();

  // Sitemap kontrolü — sıralı dene, ilk bulanı al
  const sitemapPromise = (async () => {
    // Önce standart yolları dene
    for (const path of SITEMAP_PATHS) {
      try {
        const url = `${origin}${path}`;
        const res = await fetchWithTimeout(url, SEO_TIMEOUT_MS);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          const body = await res.text();
          // XML olup olmadığını kontrol et
          if (
            contentType.includes('xml') ||
            body.trimStart().startsWith('<?xml') ||
            body.trimStart().startsWith('<urlset') ||
            body.trimStart().startsWith('<sitemapindex')
          ) {
            const trimmedBody = body.substring(0, MAX_SITEMAP_BYTES);
            result.hasSitemap = true;
            result.sitemapUrl = url;
            result.sitemapUrlCount = countSitemapUrls(trimmedBody);
            result.cms = detectCmsFromSitemap(url, trimmedBody);
            return; // Bulundu, çık
          }
        }
      } catch {
        // Bu yol çalışmadı, sonrakini dene
      }
    }
  })();

  // Her ikisini paralel bekle
  await Promise.all([robotsPromise, sitemapPromise]);

  // robots.txt'deki Sitemap: URL'sini de dene (henüz sitemap bulunamadıysa)
  if (!result.hasSitemap && result.sitemapFromRobots) {
    try {
      const res = await fetchWithTimeout(result.sitemapFromRobots, SEO_TIMEOUT_MS);
      if (res.ok) {
        const body = await res.text();
        if (
          body.trimStart().startsWith('<?xml') ||
          body.trimStart().startsWith('<urlset') ||
          body.trimStart().startsWith('<sitemapindex')
        ) {
          const trimmedBody = body.substring(0, MAX_SITEMAP_BYTES);
          result.hasSitemap = true;
          result.sitemapUrl = result.sitemapFromRobots;
          result.sitemapUrlCount = countSitemapUrls(trimmedBody);
          result.cms = result.cms || detectCmsFromSitemap(result.sitemapFromRobots, trimmedBody);
        }
      }
    } catch {
      // Erişilemedi
    }
  }

  return result;
}

/**
 * URL'yi analiz eder: redirect'leri takip eder, son URL ve yönlendirme sayısını döner.
 * redirect: 'manual' ile tek tek takip edilir.
 */
export async function analyzeUrl(urlString: string): Promise<UrlAnalysis> {
  const originalUrl = urlString.trim();
  let currentUrl = originalUrl;
  let redirectCount = 0;
  let lastStatus = 0;

  try {
    let originalHost: string | null = null;

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'UptimeTR-LoadTest-Probe/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeout);
      lastStatus = res.status;

      if (i === 0) {
        try {
          originalHost = new URL(currentUrl).hostname;
        } catch {
          originalHost = null;
        }
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) {
          return {
            originalUrl,
            finalUrl: currentUrl,
            redirectCount,
            status: res.status,
            ok: false,
            sameSite: true,
            error: 'Yönlendirme yanıtında Location header yok',
          };
        }
        redirectCount++;
        try {
          currentUrl = new URL(location, currentUrl).href;
        } catch {
          return {
            originalUrl,
            finalUrl: currentUrl,
            redirectCount,
            status: res.status,
            ok: false,
            sameSite: true,
            error: 'Geçersiz Location URL',
          };
        }
        continue;
      }

      // 2xx veya 4xx/5xx: takip bitti
      const finalHost = (() => {
        try {
          return new URL(currentUrl).hostname;
        } catch {
          return '';
        }
      })();
      const sameSite = originalHost !== null && isSameSite(originalHost, finalHost);

      // Serverless / CDN platform tespiti
      const detectedPlatform = detectServerlessPlatform(finalHost, res.headers);
      const serverlessWarning = detectedPlatform
        ? buildServerlessWarning(detectedPlatform)
        : undefined;

      // SEO sağlık kontrolü (sitemap, robots.txt)
      let seoInfo: SeoInfo | undefined;
      try {
        seoInfo = await checkSeoHealth(currentUrl);
      } catch {
        // SEO kontrolü başarısız olursa test'i engelleme
      }

      return {
        originalUrl,
        finalUrl: currentUrl,
        redirectCount,
        status: res.status,
        ok: res.status >= 200 && res.status < 400,
        sameSite,
        serverlessWarning,
        seoInfo,
      };
    }

    return {
      originalUrl,
      finalUrl: currentUrl,
      redirectCount,
      status: lastStatus,
      ok: false,
      sameSite: false,
      error: `Çok fazla yönlendirme (max ${MAX_REDIRECTS})`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const isTimeout = message.includes('abort') || message.toLowerCase().includes('timeout');
    return {
      originalUrl,
      finalUrl: originalUrl,
      redirectCount: 0,
      status: 0,
      ok: false,
      sameSite: true,
      error: isTimeout ? 'Bağlantı zaman aşımı' : message,
    };
  }
}
