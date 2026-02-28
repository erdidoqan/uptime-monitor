import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import { getUserSubscription } from '@/lib/subscription';

function calculateNextRunAt(): number {
  return Date.now();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const db = getD1Client();
    const [campaigns, subscription] = await Promise.all([
      db.queryAll(
        `SELECT * FROM traffic_campaigns WHERE user_id = ? ORDER BY created_at DESC`,
        [auth.userId]
      ),
      getUserSubscription(auth.userId),
    ]);
    const isPro = subscription?.status === 'active';

    return successResponse({
      campaigns,
      isPro,
      limits: {
        maxCampaigns: isPro ? 999 : FREE_MAX_CAMPAIGNS,
        maxDailyVisitors: isPro ? PRO_MAX_DAILY_VISITORS : FREE_MAX_DAILY_VISITORS,
      },
    });
  } catch (error: any) {
    console.error('Get traffic campaigns error:', error);
    return errorResponse(error.message || 'Failed to fetch campaigns', 500);
  }
}

const FREE_MAX_DAILY_VISITORS = 50;
const FREE_MAX_CAMPAIGNS = 1;
const PRO_MAX_DAILY_VISITORS = 2000;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const db = getD1Client();
    const subscription = await getUserSubscription(auth.userId);
    const isPro = subscription?.status === 'active';

    const existingCount = await db.queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM traffic_campaigns WHERE user_id = ?',
      [auth.userId]
    );

    if (!isPro && (existingCount?.count || 0) >= FREE_MAX_CAMPAIGNS) {
      return errorResponse(
        'Ücretsiz planda en fazla 1 kampanya oluşturabilirsiniz. Daha fazlası için Pro planına geçin.',
        402,
        { requiresPro: true }
      );
    }

    const body = await request.json();
    const {
      name,
      url,
      daily_visitors = 50,
      traffic_source = 'organic',
      session_duration = 'realistic',
      use_proxy = false,
      url_pool,
    } = body;

    if (!name || !url) {
      return errorResponse('name ve url zorunludur');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return errorResponse('URL http:// veya https:// ile başlamalıdır');
    }

    const maxDaily = isPro ? PRO_MAX_DAILY_VISITORS : FREE_MAX_DAILY_VISITORS;
    if (daily_visitors < 10 || daily_visitors > maxDaily) {
      return errorResponse(`Günlük ziyaretçi 10-${maxDaily} arası olmalıdır`, 400, { requiresPro: !isPro && daily_visitors > FREE_MAX_DAILY_VISITORS });
    }

    const start_hour = 0;
    const end_hour = 24;

    if (!['direct', 'organic', 'social'].includes(traffic_source)) {
      return errorResponse('Geçersiz trafik kaynağı');
    }

    if (!['fast', 'realistic', 'long'].includes(session_duration)) {
      return errorResponse('Geçersiz oturum süresi');
    }

    const browsersPerRun = 3;
    const tabsPerBrowser = 10;

    const id = uuidv4();
    const now = Date.now();
    const nextRunAt = calculateNextRunAt();

    const urlPoolJson = isPro && Array.isArray(url_pool) && url_pool.length > 0
      ? JSON.stringify(url_pool)
      : null;
    const urlPoolUpdatedAt = urlPoolJson ? now : null;

    await db.execute(
      `INSERT INTO traffic_campaigns (
        id, user_id, name, url, daily_visitors, browsers_per_run, tabs_per_browser,
        traffic_source, session_duration, use_proxy, start_hour, end_hour,
        is_active, next_run_at, created_at, url_pool, url_pool_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      [
        id, auth.userId, name, url, daily_visitors, browsersPerRun, tabsPerBrowser,
        traffic_source, session_duration, use_proxy ? 1 : 0, start_hour, end_hour,
        nextRunAt, now, urlPoolJson, urlPoolUpdatedAt,
      ]
    );

    const campaign = await db.queryFirst(
      'SELECT * FROM traffic_campaigns WHERE id = ?',
      [id]
    );

    return successResponse(campaign, 201);
  } catch (error: any) {
    console.error('Create traffic campaign error:', error);
    return errorResponse(error.message || 'Failed to create campaign', 500);
  }
}
