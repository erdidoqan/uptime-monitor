import { NextRequest, NextResponse } from 'next/server';
import { getD1Client } from '@/lib/d1-client';

// Public endpoint - no authentication required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await params;
    const db = getD1Client();

    // Get status page by subdomain
    const statusPage = await db.queryFirst<{
      id: string;
      company_name: string;
      subdomain: string;
      custom_domain: string | null;
      logo_url: string | null;
      logo_link_url: string | null;
      contact_url: string | null;
      is_active: number;
    }>(
      `SELECT id, company_name, subdomain, custom_domain, logo_url, logo_link_url, contact_url, is_active
       FROM status_pages 
       WHERE subdomain = ? AND is_active = 1`,
      [subdomain.toLowerCase()]
    );

    if (!statusPage) {
      return NextResponse.json(
        { error: 'Status page not found' },
        { status: 404 }
      );
    }

    // Get sections with resources
    const sections = await db.queryAll<{
      id: string;
      name: string | null;
      sort_order: number;
    }>(
      `SELECT id, name, sort_order 
       FROM status_page_sections 
       WHERE status_page_id = ? 
       ORDER BY sort_order ASC`,
      [statusPage.id]
    );

    // Calculate date range for 90 days
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    // Get resources for each section with monitor/cron_job status and uptime history
    const sectionsWithResources = await Promise.all(
      (sections as any[]).map(async (section) => {
        const resources = await db.queryAll<{
          id: string;
          resource_type: string;
          resource_id: string;
          show_history: number;
          sort_order: number;
          resource_name: string | null;
          resource_url: string | null;
          last_status: string | null;
          last_checked_at: number | null;
          is_active: number | null;
          resource_created_at: number | null;
        }>(
          `SELECT 
            spr.id,
            spr.resource_type,
            spr.resource_id,
            spr.show_history,
            spr.sort_order,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.name
              WHEN spr.resource_type = 'cron_job' THEN c.name
            END as resource_name,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.url
              WHEN spr.resource_type = 'cron_job' THEN c.url
            END as resource_url,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.last_status
              WHEN spr.resource_type = 'cron_job' THEN c.last_status
            END as last_status,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.last_checked_at
              WHEN spr.resource_type = 'cron_job' THEN c.last_run_at
            END as last_checked_at,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.is_active
              WHEN spr.resource_type = 'cron_job' THEN c.is_active
            END as is_active,
            CASE 
              WHEN spr.resource_type = 'monitor' THEN m.created_at
              WHEN spr.resource_type = 'cron_job' THEN c.created_at
            END as resource_created_at
          FROM status_page_resources spr
          LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
          LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
          WHERE spr.section_id = ?
          ORDER BY spr.sort_order ASC`,
          [section.id]
        );

        // Get uptime history for each resource
        const resourcesWithHistory = await Promise.all(
          resources.map(async (r) => {
            let uptimeHistory: { date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[] = [];
            let uptimePercentage: number | null = null;

            // Get uptime history from Worker (R2) for monitors
            if (r.resource_type === 'monitor' && r.show_history === 1) {
              try {
                uptimeHistory = await getMonitorUptimeHistory(
                  r.resource_id,
                  ninetyDaysAgo,
                  now,
                  r.resource_created_at || now
                );

                // Calculate overall uptime percentage
                const monitoredDays = uptimeHistory.filter(d => d.status !== 'unknown');
                uptimePercentage = monitoredDays.length > 0
                  ? monitoredDays.reduce((acc, d) => acc + d.uptimePercentage, 0) / monitoredDays.length
                  : null;
              } catch (error) {
                console.log('Failed to get monitor uptime history:', error);
              }
            } else if (r.resource_type === 'cron_job' && r.show_history === 1) {
              // For cron jobs, use cron_runs table
              try {
                uptimeHistory = await getCronJobUptimeHistory(
                  db,
                  r.resource_id,
                  ninetyDaysAgo,
                  now,
                  r.resource_created_at || now
                );

                const monitoredDays = uptimeHistory.filter(d => d.status !== 'unknown');
                uptimePercentage = monitoredDays.length > 0
                  ? monitoredDays.reduce((acc, d) => acc + d.uptimePercentage, 0) / monitoredDays.length
                  : null;
              } catch (error) {
                console.log('Failed to get cron job uptime history:', error);
              }
            }

            return {
              id: r.id,
              type: r.resource_type,
              resourceId: r.resource_id,
              name: r.resource_name || getHostname(r.resource_url || ''),
              url: r.resource_url,
              status: r.is_active === 0 ? 'maintenance' : (r.last_status || 'unknown'),
              lastCheckedAt: r.last_checked_at,
              showHistory: r.show_history === 1,
              uptimeHistory,
              uptimePercentage,
            };
          })
        );

        // Calculate section status
        const sectionStatus = calculateSectionStatus(resourcesWithHistory);

        return {
          ...section,
          status: sectionStatus,
          resources: resourcesWithHistory,
        };
      })
    );

    // Calculate overall status
    let overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational';
    let totalResources = 0;
    let downResources = 0;

    for (const section of sectionsWithResources) {
      for (const resource of section.resources) {
        totalResources++;
        if (resource.status === 'down') {
          downResources++;
        }
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

    const response = NextResponse.json({
      id: statusPage.id,
      companyName: statusPage.company_name,
      subdomain: statusPage.subdomain,
      customDomain: statusPage.custom_domain,
      logoUrl: statusPage.logo_url,
      logoLinkUrl: statusPage.logo_link_url,
      contactUrl: statusPage.contact_url,
      overallStatus,
      sections: sectionsWithResources,
      lastUpdated: Date.now(),
    });

    // Cache headers for CDN (Vercel, Cloudflare, etc.)
    // s-maxage: cache on CDN for 30 seconds
    // stale-while-revalidate: serve stale content while revalidating for up to 60 seconds
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=30, stale-while-revalidate=60'
    );

    return response;
  } catch (error: any) {
    console.error('Public status page error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status page' },
      { status: 500 }
    );
  }
}

// Get monitor uptime history from Worker (R2 storage)
async function getMonitorUptimeHistory(
  monitorId: string,
  startTime: number,
  endTime: number,
  createdAt: number
): Promise<{ date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[]> {
  const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
  
  try {
    const response = await fetch(
      `${workerUrl}/api/checks/${monitorId}?start_date=${startTime}&end_date=${endTime}&limit=10000`
    );
    
    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }
    
    const checks: { ts: number; status: 'up' | 'down'; latency?: number }[] = await response.json();
    
    // Aggregate checks by day
    return aggregateChecksByDay(checks, startTime, endTime, createdAt);
  } catch (error) {
    console.error('Failed to fetch monitor checks from worker:', error);
    // Return empty history with unknown status
    return generateEmptyHistory(startTime, endTime, createdAt);
  }
}

// Get cron job uptime history from database
async function getCronJobUptimeHistory(
  db: any,
  cronJobId: string,
  startTime: number,
  endTime: number,
  createdAt: number
): Promise<{ date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[]> {
  try {
    const runs = await db.queryAll(
      `SELECT ts, status FROM cron_runs 
       WHERE cron_job_id = ? AND ts >= ? AND ts <= ?
       ORDER BY ts ASC`,
      [cronJobId, startTime, endTime]
    ) as { ts: number; status: string }[];

    // Convert to check format
    const checks = runs.map(r => ({
      ts: r.ts,
      status: r.status === 'success' ? 'up' as const : 'down' as const,
    }));

    return aggregateChecksByDay(checks, startTime, endTime, createdAt);
  } catch (error) {
    console.error('Failed to fetch cron job runs:', error);
    return generateEmptyHistory(startTime, endTime, createdAt);
  }
}

// Aggregate checks by day
function aggregateChecksByDay(
  checks: { ts: number; status: 'up' | 'down' }[],
  startTime: number,
  endTime: number,
  createdAt: number
): { date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[] {
  const history: { date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[] = [];
  
  // Generate dates for 90 days
  const dates: { date: string; startOfDay: number; endOfDay: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const dayStart = new Date(endTime);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    dates.push({
      date: dayStart.toISOString().split('T')[0],
      startOfDay: dayStart.getTime(),
      endOfDay: dayEnd.getTime(),
    });
  }

  // Group checks by date
  const checksByDate = new Map<string, { up: number; down: number }>();
  
  for (const check of checks) {
    const checkDate = new Date(check.ts).toISOString().split('T')[0];
    const existing = checksByDate.get(checkDate) || { up: 0, down: 0 };
    
    if (check.status === 'up') {
      existing.up++;
    } else {
      existing.down++;
    }
    
    checksByDate.set(checkDate, existing);
  }

  // Build history
  for (const day of dates) {
    // If resource was created after this day, mark as unknown
    if (day.endOfDay < createdAt) {
      history.push({
        date: day.date,
        status: 'unknown',
        uptimePercentage: 0,
        downtimeMinutes: 0,
      });
      continue;
    }

    const dayChecks = checksByDate.get(day.date);
    
    if (dayChecks && (dayChecks.up + dayChecks.down) > 0) {
      const total = dayChecks.up + dayChecks.down;
      const uptimePercentage = (dayChecks.up / total) * 100;
      // Assume 5 minute check interval
      const downtimeMinutes = dayChecks.down * 5;
      
      let status: 'up' | 'down' | 'degraded' = 'up';
      if (uptimePercentage < 50) {
        status = 'down';
      } else if (uptimePercentage < 100) {
        status = 'degraded';
      }

      history.push({
        date: day.date,
        status,
        uptimePercentage,
        downtimeMinutes,
      });
    } else {
      // No checks for this day
      history.push({
        date: day.date,
        status: 'unknown',
        uptimePercentage: 0,
        downtimeMinutes: 0,
      });
    }
  }

  return history;
}

// Generate empty history (all unknown)
function generateEmptyHistory(
  startTime: number,
  endTime: number,
  createdAt: number
): { date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[] {
  const history: { date: string; status: 'up' | 'down' | 'degraded' | 'unknown'; uptimePercentage: number; downtimeMinutes: number }[] = [];
  
  for (let i = 89; i >= 0; i--) {
    const dayStart = new Date(endTime);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    
    history.push({
      date: dayStart.toISOString().split('T')[0],
      status: 'unknown',
      uptimePercentage: 0,
      downtimeMinutes: 0,
    });
  }
  
  return history;
}

function calculateSectionStatus(resources: any[]): 'operational' | 'degraded' | 'partial_outage' | 'major_outage' {
  if (resources.length === 0) return 'operational';
  
  let downCount = 0;
  let degradedCount = 0;
  
  for (const resource of resources) {
    if (resource.status === 'down') {
      downCount++;
    } else if (resource.status === 'degraded') {
      degradedCount++;
    }
  }
  
  if (downCount === resources.length) return 'major_outage';
  if (downCount > 0) return 'partial_outage';
  if (degradedCount > 0) return 'degraded';
  return 'operational';
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url || 'Unknown';
  }
}
