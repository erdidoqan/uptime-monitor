import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequest,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import {
  isValidTargetUrl,
  getMaxBrowsersForTier,
  getMaxTabsForTier,
  isValidBrowserCount,
  isValidTabCount,
  getMaxBatches,
  JWT_EXPIRY_SEC,
  GUEST_MAX_TESTS,
  FREE_MAX_TESTS,
  FREE_MAX_BROWSERS,
} from '@/lib/browser-test-limits';
import type { UserTier } from '@/lib/browser-test-limits';
import { analyzeUrl } from '@/lib/load-test-analyze';
import { getUserSubscription } from '@/lib/subscription';

type TrafficSource = 'direct' | 'organic' | 'social';
type SessionDuration = 'fast' | 'realistic' | 'long';

const VALID_TRAFFIC_SOURCES: TrafficSource[] = ['direct', 'organic', 'social'];
const VALID_SESSION_DURATIONS: SessionDuration[] = ['fast', 'realistic', 'long'];

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

function extractRootDomain(urlString: string): string {
  try {
    const hostname = new URL(urlString).hostname.toLowerCase();
    const parts = hostname.split('.');
    if (parts.length <= 2 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return hostname;
    const twoPartTlds = [
      'co.uk', 'com.tr', 'org.tr', 'net.tr', 'gov.tr', 'edu.tr', 'web.tr',
      'com.br', 'co.jp', 'co.kr', 'com.au', 'co.in', 'co.za', 'com.mx',
    ];
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTlds.includes(lastTwo)) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  } catch {
    return urlString.toLowerCase();
  }
}

function todayStartMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const isAuthenticated = !!auth;
    const db = getD1Client();
    const ip = getClientIP(request);

    const body = await request.json();
    const { url, targetBrowsers, tabsPerBrowser, useProxy, confirmDomain } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('URL gerekli', 400);
    }

    /* ── Tier belirleme ── */
    let tier: UserTier = 'guest';
    if (isAuthenticated && auth) {
      tier = 'free';
      try {
        const subscription = await getUserSubscription(auth.userId);
        if (subscription && subscription.status === 'active') {
          tier = 'pro';
        }
      } catch (subErr) {
        console.error('[browser-test/start] Subscription check failed:', subErr);
      }
    }

    /* ── Ban kontrolü ── */
    if (isAuthenticated && auth) {
      try {
        const banned = await db.queryFirst<{ is_banned: number }>(
          'SELECT is_banned FROM users WHERE id = ?',
          [auth.userId]
        );
        if (banned?.is_banned) {
          return errorResponse('Hesabınız askıya alınmıştır.', 403, { banned: true });
        }
      } catch {}
    }

    if (ip && ip !== 'unknown') {
      try {
        const ipBanned = await db.queryFirst<{ ip: string }>(
          'SELECT ip FROM banned_ips WHERE ip = ?',
          [ip]
        );
        if (ipBanned) {
          return errorResponse('IP adresiniz engellenmiştir.', 403, { banned: true });
        }
      } catch {}
    }

    /* ── Browser/tab validasyon ── */
    const maxBrowsers = getMaxBrowsersForTier(tier);
    const maxTabs = getMaxTabsForTier(tier);
    const browsers = typeof targetBrowsers === 'number' ? targetBrowsers : 1;
    const tabs = typeof tabsPerBrowser === 'number' ? tabsPerBrowser : maxTabs;

    if (!isValidBrowserCount(browsers, maxBrowsers)) {
      if (browsers > FREE_MAX_BROWSERS && tier === 'free') {
        return errorResponse(
          '5+ browser için Pro abonelik ($5/ay) gereklidir.',
          403,
          { requiresPlan: 'pro' }
        );
      }
      return errorResponse(`Browser sayısı 1-${maxBrowsers} arası olmalı`, 400);
    }
    if (!isValidTabCount(tabs, maxTabs)) {
      return errorResponse(`Tab sayısı 1-${maxTabs} arası olmalı`, 400);
    }

    /* ── Traffic source & session duration ── */
    const trafficSource: TrafficSource =
      VALID_TRAFFIC_SOURCES.includes(body.trafficSource) ? body.trafficSource : 'organic';

    let sessionDuration: SessionDuration =
      VALID_SESSION_DURATIONS.includes(body.sessionDuration) ? body.sessionDuration : 'fast';

    const isPro = tier === 'pro' || (tier as string) === 'enterprise';
    if ((sessionDuration === 'realistic' || sessionDuration === 'long') && !isPro) {
      sessionDuration = 'fast';
    }

    /* ── URL validasyon ── */
    const urlCheck = isValidTargetUrl(url);
    if (!urlCheck.valid) {
      if (urlCheck.blockedDomain) {
        return errorResponse(urlCheck.error || 'Bu siteye test yapılamaz', 403, { blockedDomain: true });
      }
      return errorResponse(urlCheck.error || 'Geçersiz URL', 400);
    }

    /* ── Misafir limit ── */
    if (!isAuthenticated) {
      try {
        const guestCount = await db.queryFirst<{ count: number }>(
          `SELECT COUNT(*) as count FROM browser_tests WHERE ip_address = ? AND status NOT IN ('failed', 'abandoned')`,
          [ip]
        );
        if (guestCount && guestCount.count >= GUEST_MAX_TESTS) {
          return errorResponse(
            'Misafir olarak 1 test hakkınız bulunmaktadır. Daha fazla test için giriş yapın.',
            403,
            { requiresAuth: true }
          );
        }
      } catch {}
    }

    /* ── Free kullanıcı limit ── */
    if (isAuthenticated && auth && tier === 'free') {
      try {
        const freeCount = await db.queryFirst<{ count: number }>(
          `SELECT COUNT(*) as count FROM browser_tests WHERE user_id = ? AND status NOT IN ('failed', 'abandoned')`,
          [auth.userId]
        );
        if (freeCount && freeCount.count >= FREE_MAX_TESTS) {
          return errorResponse(
            `Ücretsiz hesabınızla ${FREE_MAX_TESTS} test hakkınız bulunmaktadır. Sınırsız test için Pro planına geçin.`,
            403,
            { requiresPlan: 'pro', freeTestLimitReached: true }
          );
        }
      } catch {}
    }

    /* ── Domain kontrolleri ── */
    const rootDomain = extractRootDomain(url);

    if (isAuthenticated && auth) {
      try {
        if (!confirmDomain) {
          const todayCount = await db.queryFirst<{ count: number }>(
            `SELECT COUNT(*) as count FROM browser_tests
             WHERE user_id = ? AND target_url LIKE ? AND created_at > ? AND status NOT IN ('failed', 'abandoned')`,
            [auth.userId, `%${rootDomain}%`, todayStartMs()]
          );
          if (todayCount && todayCount.count >= 1) {
            return errorResponse(
              `Bu domaini (${rootDomain}) bugün zaten test ettiniz. Tekrar test etmek istediğinize emin misiniz?`,
              409,
              { domainWarning: true, domain: rootDomain }
            );
          }
        }
      } catch {}
    }

    /* ── URL analizi ── */
    const analysis = await analyzeUrl(url);
    if (analysis.error) {
      return errorResponse(analysis.error, 400);
    }
    if (!analysis.sameSite) {
      return errorResponse('URL farklı bir domaine yönlendiriyor.', 400);
    }
    const finalUrlCheck = isValidTargetUrl(analysis.finalUrl);
    if (!finalUrlCheck.valid) {
      if (finalUrlCheck.blockedDomain) {
        return errorResponse(finalUrlCheck.error || 'Bu siteye test yapılamaz', 403, { blockedDomain: true });
      }
      return errorResponse(finalUrlCheck.error || 'Nihai URL geçersiz', 400);
    }

    const targetUrl = analysis.finalUrl;

    /* ── JWT oluştur ── */
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return errorResponse('Sunucu yapılandırma hatası (JWT)', 500);
    }

    const maxBatches = getMaxBatches();
    const runId = crypto.randomUUID();

    const token = jwt.sign(
      {
        url: targetUrl,
        maxBrowsers: browsers,
        maxTabs: tabs,
        maxBatches,
        runId,
        useProxy: !!useProxy,
        trafficSource,
        sessionDuration,
      },
      secret,
      { expiresIn: JWT_EXPIRY_SEC }
    );

    const workerUrl = process.env.BROWSER_TEST_WORKER_URL || '';
    if (!workerUrl) {
      return errorResponse('Browser test servisi yapılandırılmamış (Worker URL)', 500);
    }

    const baseUrl = workerUrl.replace(/\/$/, '');
    const batchEndpoint = baseUrl + '/browser-test-batch';

    /* ── D1 INSERT ── */
    try {
      await db.execute(
        `INSERT INTO browser_tests (
          id, user_id, url, target_url, target_browsers, tabs_per_browser,
          status, created_at, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?)`,
        [runId, auth?.userId ?? null, url, targetUrl, browsers, tabs, Date.now(), ip],
      );
    } catch (dbErr) {
      console.error('[browser-test/start] D1 insert failed:', dbErr instanceof Error ? dbErr.message : dbErr);
    }

    return successResponse({
      token,
      runId,
      workerUrl: batchEndpoint,
      targetUrl,
      targetBrowsers: browsers,
      tabsPerBrowser: tabs,
      redirectInfo:
        analysis.redirectCount > 0
          ? {
              originalUrl: analysis.originalUrl,
              finalUrl: analysis.finalUrl,
              redirectCount: analysis.redirectCount,
            }
          : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'İstek işlenemedi';
    console.error('[browser-test/start] Error:', message);
    return errorResponse('İstek işlenemedi', 500);
  }
}
