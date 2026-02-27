import { NextRequest } from 'next/server';
import {
  authenticateRequestOrToken,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { getUserSubscription } from '@/lib/subscription';

const FEED_PATHS = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/sitemap.xml', '/sitemap_index.xml'];
const MAX_URLS = 50;
const FETCH_TIMEOUT = 5000;

function extractUrlsFromRss(xml: string, origin: string): string[] {
  const urls: string[] = [];
  const linkRegex = /<link[^>]*>([^<]+)<\/link>/gi;
  let match;
  while ((match = linkRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http') && url.includes(new URL(origin).hostname)) {
      urls.push(url);
    }
  }
  if (urls.length === 0) {
    const atomRegex = /<link[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/gi;
    while ((match = atomRegex.exec(xml)) !== null) {
      const url = match[1].trim();
      if (url.startsWith('http') && url.includes(new URL(origin).hostname)) {
        urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

function extractUrlsFromSitemap(xml: string, origin: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http') && url.includes(new URL(origin).hostname)) {
      if (!url.endsWith('.xml') && !url.includes('sitemap')) {
        urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

function extractSitemapIndexUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url.endsWith('.xml') || url.includes('sitemap')) {
      urls.push(url);
    }
  }
  return urls;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UptimeTR Bot/1.0' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const subscription = await getUserSubscription(auth.userId);
    const isPro = subscription?.status === 'active';
    if (!isPro) {
      return errorResponse('Bu özellik Pro plana özeldir', 403, { requiresPro: true });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return errorResponse('URL gerekli');
    }

    let origin: string;
    try {
      const parsed = new URL(url);
      origin = parsed.origin;
    } catch {
      return errorResponse('Geçersiz URL');
    }

    for (const feedPath of FEED_PATHS) {
      const feedUrl = origin + feedPath;
      const xml = await fetchWithTimeout(feedUrl, FETCH_TIMEOUT);
      if (!xml) continue;

      const isSitemap = feedPath.includes('sitemap');

      if (isSitemap) {
        const sitemapIndexUrls = extractSitemapIndexUrls(xml);
        if (sitemapIndexUrls.length > 0) {
          let allUrls: string[] = [];
          for (const sitemapUrl of sitemapIndexUrls.slice(0, 3)) {
            const subXml = await fetchWithTimeout(sitemapUrl, FETCH_TIMEOUT);
            if (subXml) {
              allUrls.push(...extractUrlsFromSitemap(subXml, origin));
            }
            if (allUrls.length >= MAX_URLS) break;
          }
          if (allUrls.length > 0) {
            return successResponse({
              urls: allUrls.slice(0, MAX_URLS),
              source: 'sitemap' as const,
            });
          }
        }

        const sitemapUrls = extractUrlsFromSitemap(xml, origin);
        if (sitemapUrls.length > 0) {
          return successResponse({
            urls: sitemapUrls.slice(0, MAX_URLS),
            source: 'sitemap' as const,
          });
        }
      } else {
        const rssUrls = extractUrlsFromRss(xml, origin);
        if (rssUrls.length > 0) {
          return successResponse({
            urls: rssUrls.slice(0, MAX_URLS),
            source: 'rss' as const,
          });
        }
      }
    }

    return successResponse({ urls: [], source: 'none' as const });
  } catch (error: any) {
    console.error('Discover URLs error:', error);
    return errorResponse(error.message || 'URL keşfi başarısız oldu', 500);
  }
}
