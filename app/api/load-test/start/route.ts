import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import {
  isAllowedTotalRequests,
  isValidTargetUrl,
  isValidConcurrentUsers,
  getBatchConcurrencyForConcurrentUsers,
  getMaxConcurrentForTier,
  WORKER_CONCURRENT,
  COUNT_PER_BATCH,
  JWT_EXPIRY_SEC,
  GUEST_MAX_BUDGET,
  AUTH_MAX_BUDGET,
  GUEST_MAX_TESTS,
  FREE_MAX_TESTS,
  FREE_MAX_CONCURRENT,
} from '@/lib/load-test-limits';
import type { UserTier } from '@/lib/load-test-limits';
import { analyzeUrl } from '@/lib/load-test-analyze';
import { getUserSubscription } from '@/lib/subscription';

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

/** URL'den domain çıkar (hostname) */
function extractDomain(urlString: string): string {
  try {
    return new URL(urlString).hostname.toLowerCase();
  } catch {
    return urlString.toLowerCase();
  }
}

/** Hostname'den root domain çıkar (subdomain'leri kaldırır) */
function extractRootDomain(urlString: string): string {
  const hostname = extractDomain(urlString);
  const parts = hostname.split('.');
  if (parts.length <= 2 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return hostname;
  const twoPartTlds = [
    'co.uk', 'com.tr', 'org.tr', 'net.tr', 'gov.tr', 'edu.tr', 'web.tr',
    'com.br', 'co.jp', 'co.kr', 'com.au', 'co.in', 'co.za', 'com.mx',
  ];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo)) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/** Bugünün başlangıç timestamp'i (UTC 00:00) */
function todayStartMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export interface LoadTestStartPayload {
  url: string;
  totalRequests: number;
  concurrentUsers: number;
  confirmDomain?: boolean;
  confirmServerless?: boolean;
  confirmSeo?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const isAuthenticated = !!auth;
    const db = getD1Client();
    const ip = getClientIP(request);

    const body: LoadTestStartPayload = await request.json();
    const { url, totalRequests, concurrentUsers } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('URL gerekli', 400);
    }
    if (typeof totalRequests !== 'number' || totalRequests < 1) {
      return errorResponse('totalRequests geçerli bir sayı olmalı', 400);
    }

    /* ── Tier belirleme ── */
    let tier: UserTier = 'guest';
    if (isAuthenticated && auth) {
      tier = 'free'; // varsayılan: giriş yapmış ama abonelik yok
      try {
        const subscription = await getUserSubscription(auth.userId);
        if (subscription && subscription.status === 'active') {
          tier = 'pro';
        }
      } catch (subErr) {
        console.error('[load-test/start] Subscription check failed:', subErr);
        // Hata olursa free tier olarak devam et
      }
    }

    /* ── Ban kontrolü (hesap + IP) ── */
    if (isAuthenticated && auth) {
      try {
        const banned = await db.queryFirst<{ is_banned: number }>(
          'SELECT is_banned FROM users WHERE id = ?',
          [auth.userId]
        );
        if (banned?.is_banned) {
          return errorResponse(
            'Hesabınız kullanım politikası ihlali nedeniyle askıya alınmıştır.',
            403,
            { banned: true }
          );
        }
      } catch (banErr) {
        console.error('[load-test/start] Ban check failed:', banErr);
      }
    }

    /* ── IP ban kontrolü ── */
    if (ip && ip !== 'unknown') {
      try {
        const ipBanned = await db.queryFirst<{ ip: string }>(
          'SELECT ip FROM banned_ips WHERE ip = ?',
          [ip]
        );
        if (ipBanned) {
          return errorResponse(
            'IP adresiniz kullanım politikası ihlali nedeniyle engellenmiştir.',
            403,
            { banned: true }
          );
        }
      } catch (ipBanErr) {
        console.error('[load-test/start] IP ban check failed:', ipBanErr);
      }
    }

    const maxConcurrent = getMaxConcurrentForTier(tier);
    if (!isValidConcurrentUsers(concurrentUsers, maxConcurrent)) {
      if (concurrentUsers > FREE_MAX_CONCURRENT && tier === 'free') {
        return errorResponse(
          '500+ eşzamanlı kullanıcı için Pro abonelik ($5/ay) gereklidir.',
          403,
          { requiresPlan: 'pro' }
        );
      }
      return errorResponse(`concurrentUsers 10-${maxConcurrent.toLocaleString('tr-TR')} arası, 10'un katı olmalı`, 400);
    }

    const urlCheck = isValidTargetUrl(url);
    if (!urlCheck.valid) {
      if (urlCheck.blockedDomain) {
        return errorResponse(urlCheck.error || 'Bu siteye yük testi yapılamaz', 403, { blockedDomain: true });
      }
      return errorResponse(urlCheck.error || 'Geçersiz URL', 400);
    }

    const maxBudget = isAuthenticated ? AUTH_MAX_BUDGET : GUEST_MAX_BUDGET;
    if (!isAllowedTotalRequests(totalRequests, isAuthenticated)) {
      return errorResponse(
        isAuthenticated
          ? `Toplam istek sayısı 1 ile ${maxBudget.toLocaleString('tr-TR')} arasında olmalı`
          : `Misafirler için maksimum ${GUEST_MAX_BUDGET.toLocaleString('tr-TR')} istek. Daha fazlası için giriş yapın.`,
        400
      );
    }

    /* ── Misafir limit: toplam 1 test (IP bazlı D1 kontrolü) ── */
    if (!isAuthenticated) {
      try {
        const guestCount = await db.queryFirst<{ count: number }>(
          `SELECT COUNT(*) as count FROM load_tests WHERE ip_address = ? AND status NOT IN ('failed', 'abandoned')`,
          [ip]
        );
        if (guestCount && guestCount.count >= GUEST_MAX_TESTS) {
          return errorResponse(
            'Misafir olarak 1 test hakkınız bulunmaktadır. Daha fazla test için Google ile giriş yapın.',
            403,
            { requiresAuth: true }
          );
        }
      } catch (dbErr) {
        console.error('[load-test/start] Guest limit check failed:', dbErr);
      }
    }

    /* ── Free kullanıcı limit: toplam 3 test ── */
    if (isAuthenticated && auth && tier === 'free') {
      try {
        const freeCount = await db.queryFirst<{ count: number }>(
          `SELECT COUNT(*) as count FROM load_tests WHERE user_id = ? AND status NOT IN ('failed', 'abandoned')`,
          [auth.userId]
        );
        if (freeCount && freeCount.count >= FREE_MAX_TESTS) {
          return errorResponse(
            `Ücretsiz hesabınızla ${FREE_MAX_TESTS} test hakkınız bulunmaktadır ve tamamını kullandınız. Sınırsız test için Pro planına ($5/ay) geçin.`,
            403,
            { requiresPlan: 'pro', freeTestLimitReached: true, used: freeCount.count, limit: FREE_MAX_TESTS }
          );
        }
      } catch (dbErr) {
        console.error('[load-test/start] Free user limit check failed:', dbErr);
      }
    }

    /* ── Domain kontrolleri (root domain bazında) ── */
    const rootDomain = extractRootDomain(url);
    const confirmDomain = body.confirmDomain === true;

    if (isAuthenticated && auth) {
      try {
        /* Aynı kullanıcı — aynı gün uyarısı (engellemez, onay ile devam eder) */
        if (!confirmDomain) {
          const todayCount = await db.queryFirst<{ count: number }>(
            `SELECT COUNT(*) as count FROM load_tests 
             WHERE user_id = ? AND domain = ? AND created_at > ? AND status NOT IN ('failed', 'abandoned')`,
            [auth.userId, rootDomain, todayStartMs()]
          );
          if (todayCount && todayCount.count >= 1) {
            return errorResponse(
              `Bu domaini (${rootDomain}) bugün zaten test ettiniz. Tekrar test etmek sitenin sizi bot olarak algılamasına neden olabilir.`,
              409,
              { domainWarning: true, domain: rootDomain }
            );
          }
        }

        /* Cross-user domain kilidi — son 24 saatte başka kullanıcı test ettiyse engelle */
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const otherUserTest = await db.queryFirst<{ user_id: string }>(
          `SELECT user_id FROM load_tests 
           WHERE domain = ? AND user_id != ? AND user_id IS NOT NULL
           AND created_at > ? AND status NOT IN ('failed', 'abandoned')
           LIMIT 1`,
          [rootDomain, auth.userId, oneDayAgo]
        );
        if (otherUserTest) {
          return errorResponse(
            `Bu domain (${rootDomain}) son 24 saat içinde başka bir kullanıcı tarafından test edilmiştir. Lütfen daha sonra tekrar deneyin.`,
            403,
            { domainLocked: true }
          );
        }

        /* Spam tespiti — aynı gün aynı domain'e 5+ test → ban */
        const spamCount = await db.queryFirst<{ count: number }>(
          `SELECT COUNT(*) as count FROM load_tests 
           WHERE user_id = ? AND domain = ? AND created_at > ? AND status NOT IN ('failed', 'abandoned')`,
          [auth.userId, rootDomain, todayStartMs()]
        );
        if (spamCount && spamCount.count >= 5) {
          try {
            await db.execute('UPDATE users SET is_banned = 1 WHERE id = ?', [auth.userId]);
          } catch (banErr) {
            console.error('[load-test/start] Ban update failed:', banErr);
          }
          return errorResponse(
            'Aynı domain üzerinde aşırı sayıda test tespit edildi. Hesabınız kullanım politikası ihlali nedeniyle askıya alınmıştır.',
            403,
            { banned: true }
          );
        }
      } catch (dbErr) {
        console.error('[load-test/start] Domain check failed:', dbErr);
      }
    }

    const analysis = await analyzeUrl(url);
    if (analysis.error) {
      return errorResponse(analysis.error, 400);
    }
    if (!analysis.sameSite) {
      return errorResponse(
        'URL farklı bir domaine yönlendiriyor. Sadece aynı site içi yönlendirmelere izin veriliyor.',
        400
      );
    }
    const finalUrlCheck = isValidTargetUrl(analysis.finalUrl);
    if (!finalUrlCheck.valid) {
      if (finalUrlCheck.blockedDomain) {
        return errorResponse(finalUrlCheck.error || 'Bu siteye yük testi yapılamaz', 403, { blockedDomain: true });
      }
      return errorResponse(
        finalUrlCheck.error || 'Nihai URL geçersiz',
        400
      );
    }

    /* ── Serverless/CDN platform uyarısı (onay gerektirir) ── */
    const confirmServerless = body.confirmServerless === true;
    if (analysis.serverlessWarning && !confirmServerless) {
      return errorResponse(
        analysis.serverlessWarning.message,
        409,
        {
          serverlessWarning: true,
          platform: analysis.serverlessWarning.platform,
          // SEO bilgisini de birlikte gönder, UI tek ekranda göstersin
          ...(analysis.seoInfo ? { seoInfo: analysis.seoInfo } : {}),
        }
      );
    }

    /* ── SEO bilgisi (sitemap/robots.txt) ── ilk istekte bilgilendirme döner ── */
    const confirmSeo = body.confirmSeo === true;
    if (analysis.seoInfo && !confirmSeo) {
      const seo = analysis.seoInfo;
      let seoMessage: string;
      if (!seo.hasSitemap) {
        seoMessage = 'Sitemap.xml dosyanız bulunamadı. Google sitenizin sayfalarını tam olarak keşfedemiyor olabilir. SEO performansınız ciddi şekilde etkilenebilir.';
        if (!seo.hasRobotsTxt) {
          seoMessage += ' Ayrıca robots.txt dosyanız da bulunamadı.';
        }
      } else {
        seoMessage = `Sitemap tespit edildi: ${seo.sitemapUrlCount ?? '?'} sayfa bulundu.`;
        if (seo.cms) seoMessage += ` (${seo.cms})`;
        if (seo.hasRobotsTxt && seo.robotsAllowsCrawl === false) {
          seoMessage += ' Ancak robots.txt Googlebot erişimini engelliyor!';
        }
      }
      return errorResponse(
        seoMessage,
        409,
        { seoInfo: seo, seoWarning: true }
      );
    }

    const targetUrl = analysis.finalUrl;
    const seoInfoJson = analysis.seoInfo ? JSON.stringify(analysis.seoInfo) : null;
    const countPerBatch = COUNT_PER_BATCH;
    // maxBatches: dynamicCount en düşük WORKER_CONCURRENT (6) olabilir,
    // o yüzden worst-case batch sayısı = ceil(totalRequests / 6)
    const maxBatches = Math.ceil(totalRequests / WORKER_CONCURRENT);
    const maxConcurrency = getBatchConcurrencyForConcurrentUsers(concurrentUsers);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[load-test/start] JWT_SECRET env eksik. Vercel → Project Settings → Environment Variables');
      return errorResponse('Sunucu yapılandırma hatası (JWT)', 500);
    }

    const runId = crypto.randomUUID();
    const token = jwt.sign(
      {
        url: targetUrl,
        countPerBatch,
        maxBatches,
        maxConcurrency,
        runId,
      },
      secret,
      { expiresIn: JWT_EXPIRY_SEC }
    );

    const workerUrl = process.env.LOAD_TEST_WORKER_URL || '';
    if (!workerUrl) {
      console.error('[load-test/start] LOAD_TEST_WORKER_URL env eksik. Vercel → Project Settings → Environment Variables');
      return errorResponse('Load test servisi yapılandırılmamış (Worker URL)', 500);
    }

    const baseUrl = workerUrl.replace(/\/$/, '');
    const batchEndpoint = baseUrl + '/load-test-batch';
    const cancelEndpoint = baseUrl + '/load-test-cancel';

    /* D1'e ilk kayıt: test başlıyor (status=running) */
    const domainForInsert = extractRootDomain(targetUrl);
    try {
      await db.execute(
        `INSERT INTO load_tests (
          id, user_id, url, target_url, domain, target_concurrent_users,
          total_requests, request_mode, status, created_at, ip_address, seo_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)`,
        [
          runId,
          auth?.userId ?? null,
          url,
          targetUrl,
          domainForInsert,
          concurrentUsers,
          totalRequests,
          null,
          Date.now(),
          ip,
          seoInfoJson,
        ],
      );
    } catch (dbErr) {
      // DB hatası testi engellemesin, sadece logla
      console.error('[load-test/start] D1 insert failed:', dbErr instanceof Error ? dbErr.message : dbErr);
    }

    return successResponse({
      token,
      runId,
      batches: maxBatches,
      countPerBatch,
      maxConcurrency,
      workerUrl: batchEndpoint,
      cancelUrl: cancelEndpoint,
      targetUrl,
      redirectInfo:
        analysis.redirectCount > 0
          ? {
              originalUrl: analysis.originalUrl,
              finalUrl: analysis.finalUrl,
              redirectCount: analysis.redirectCount,
              status: analysis.status,
            }
          : undefined,
      serverlessWarning: analysis.serverlessWarning ?? undefined,
      seoInfo: analysis.seoInfo ?? undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'İstek işlenemedi';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[load-test/start] Error:', message, stack ?? '');
    const safeMessage =
      process.env.NODE_ENV === 'production'
        ? 'İstek işlenemedi. Vercel Function loglarına bakın.'
        : message;
    return errorResponse(safeMessage, 500);
  }
}
