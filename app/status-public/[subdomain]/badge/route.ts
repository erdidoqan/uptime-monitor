import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';

// Status configuration
const statusConfig = {
  operational: {
    title: 'Tüm sistemler çalışıyor',
    light: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', dot: '#10b981' },
    dark: { bg: '#022c22', border: '#065f46', text: '#6ee7b7', dot: '#34d399' },
  },
  degraded: {
    title: 'Bazı sistemler yavaşladı',
    light: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
    dark: { bg: '#451a03', border: '#92400e', text: '#fcd34d', dot: '#fbbf24' },
  },
  partial_outage: {
    title: 'Kısmi kesinti',
    light: { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', dot: '#f97316' },
    dark: { bg: '#431407', border: '#9a3412', text: '#fdba74', dot: '#fb923c' },
  },
  major_outage: {
    title: 'Büyük kesinti',
    light: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', dot: '#ef4444' },
    dark: { bg: '#450a0a', border: '#991b1b', text: '#fca5a5', dot: '#f87171' },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get('theme') || 'light';
  const isDark = theme === 'dark';

  try {
    const db = getD1Client();

    const slug = subdomain.toLowerCase();
    let statusPage = await db.queryFirst<{
      id: string;
      company_name: string;
      subdomain: string;
      custom_domain: string | null;
    }>(
      `SELECT id, company_name, subdomain, custom_domain
       FROM status_pages 
       WHERE subdomain = ? AND is_active = 1`,
      [slug]
    );

    if (!statusPage) {
      statusPage = await db.queryFirst(
        `SELECT id, company_name, subdomain, custom_domain
         FROM status_pages 
         WHERE custom_domain = ? AND is_active = 1`,
        [slug]
      );
    }

    if (!statusPage) {
      return new NextResponse('Status page not found', { status: 404 });
    }

    // Get all resources to calculate overall status
    const resources = await db.queryAll<{
      last_status: string | null;
      is_active: number | null;
    }>(
      `SELECT 
        CASE 
          WHEN spr.resource_type = 'monitor' THEN m.last_status
          WHEN spr.resource_type = 'cron_job' THEN c.last_status
        END as last_status,
        CASE 
          WHEN spr.resource_type = 'monitor' THEN m.is_active
          WHEN spr.resource_type = 'cron_job' THEN c.is_active
        END as is_active
      FROM status_page_resources spr
      JOIN status_page_sections sps ON spr.section_id = sps.id
      LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
      LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
      WHERE sps.status_page_id = ?`,
      [statusPage.id]
    );

    // Calculate overall status
    let overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational';
    let totalResources = 0;
    let downResources = 0;

    for (const resource of resources) {
      totalResources++;
      const status = resource.is_active === 0 ? 'maintenance' : (resource.last_status || 'unknown');
      if (status === 'down') {
        downResources++;
      }
    }

    if (downResources > 0) {
      if (downResources === totalResources) {
        overallStatus = 'major_outage';
      } else if (downResources > totalResources / 2) {
        overallStatus = 'partial_outage';
      } else {
        overallStatus = 'degraded';
      }
    }

    // Build status page URL
    const statusPageUrl = statusPage.custom_domain 
      ? `https://${statusPage.custom_domain}`
      : `https://${statusPage.subdomain}.uptimetr.com`;

    const config = statusConfig[overallStatus];
    const colors = isDark ? config.dark : config.light;

    // Generate HTML
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${statusPage.company_name} Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      min-height: 36px;
      padding: 0;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1px solid ${colors.border};
      background: ${colors.bg};
      color: ${colors.text};
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .badge:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${colors.dot};
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <a href="${statusPageUrl}" target="_blank" rel="noopener noreferrer" class="badge">
    <span class="dot"></span>
    <span>${config.title}</span>
  </a>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Badge error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
