import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import {
  authenticateRequestOrToken,
  unauthorizedResponse,
  errorResponse,
  successResponse,
} from '@/lib/api-helpers';
import { v4 as uuidv4 } from 'uuid';
import { canCreateResource } from '@/lib/subscription';

function calculateNextRunAt(startHour: number, endHour: number, dailyVisitors: number, visitorsPerRun: number): number {
  const now = new Date();
  const currentHour = now.getUTCHours();

  const runsPerDay = Math.max(1, Math.ceil(dailyVisitors / visitorsPerRun));
  const workingHours = endHour - startHour;
  const intervalMs = Math.floor((workingHours * 3600 * 1000) / runsPerDay);

  if (currentHour >= startHour && currentHour < endHour) {
    return Date.now() + Math.min(intervalMs, 60_000);
  }

  const tomorrow = new Date(now);
  if (currentHour >= endHour) {
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  }
  tomorrow.setUTCHours(startHour, 0, 0, 0);
  return tomorrow.getTime();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const db = getD1Client();
    const campaigns = await db.queryAll(
      `SELECT * FROM traffic_campaigns WHERE user_id = ? ORDER BY created_at DESC`,
      [auth.userId]
    );

    return successResponse(campaigns);
  } catch (error: any) {
    console.error('Get traffic campaigns error:', error);
    return errorResponse(error.message || 'Failed to fetch campaigns', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequestOrToken(request);
    if (!auth) return unauthorizedResponse();

    const resourceCheck = await canCreateResource(auth.userId);
    if (!resourceCheck.allowed) {
      return errorResponse(resourceCheck.reason || 'Kaynak limiti aşıldı', 402);
    }

    const body = await request.json();
    const {
      name,
      url,
      daily_visitors = 50,
      traffic_source = 'organic',
      session_duration = 'realistic',
      use_proxy = false,
      start_hour = 9,
      end_hour = 22,
    } = body;

    if (!name || !url) {
      return errorResponse('name ve url zorunludur');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return errorResponse('URL http:// veya https:// ile başlamalıdır');
    }

    if (daily_visitors < 10 || daily_visitors > 2000) {
      return errorResponse('Günlük ziyaretçi 10-2000 arası olmalıdır');
    }

    if (start_hour < 0 || start_hour > 23 || end_hour < 1 || end_hour > 24 || start_hour >= end_hour) {
      return errorResponse('Çalışma saatleri geçersiz');
    }

    if (!['direct', 'organic', 'social'].includes(traffic_source)) {
      return errorResponse('Geçersiz trafik kaynağı');
    }

    if (!['fast', 'realistic', 'long'].includes(session_duration)) {
      return errorResponse('Geçersiz oturum süresi');
    }

    const browsersPerRun = 3;
    const tabsPerBrowser = 10;
    const visitorsPerRun = browsersPerRun * tabsPerBrowser;

    const db = getD1Client();
    const id = uuidv4();
    const now = Date.now();
    const nextRunAt = calculateNextRunAt(start_hour, end_hour, daily_visitors, visitorsPerRun);

    await db.execute(
      `INSERT INTO traffic_campaigns (
        id, user_id, name, url, daily_visitors, browsers_per_run, tabs_per_browser,
        traffic_source, session_duration, use_proxy, start_hour, end_hour,
        is_active, next_run_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        id, auth.userId, name, url, daily_visitors, browsersPerRun, tabsPerBrowser,
        traffic_source, session_duration, use_proxy ? 1 : 0, start_hour, end_hour,
        nextRunAt, now,
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
