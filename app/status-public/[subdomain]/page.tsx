import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getD1Client } from '@/lib/d1-client';
import { StatusPageContent } from './status-page-content';

// Revalidate every 30 seconds - this enables ISR
export const revalidate = 30;

// Types
interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptimePercentage: number;
  downtimeMinutes: number;
}

interface Resource {
  id: string;
  type: string;
  resourceId: string;
  name: string;
  url: string | null;
  status: string;
  lastCheckedAt: number | null;
  showHistory: boolean;
  uptimeHistory: UptimeDay[];
  uptimePercentage: number | null;
}

interface Section {
  id: string;
  name: string | null;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  resources: Resource[];
}

interface StatusPageData {
  id: string;
  companyName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  contactUrl: string | null;
  overallStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
  sections: Section[];
}

// Fetch status page data from database WITH uptime history
async function fetchStatusPageData(subdomain: string): Promise<StatusPageData | null> {
  try {
    if (!subdomain || typeof subdomain !== 'string') {
      return null;
    }
    
    const db = getD1Client();

    const slug = subdomain.toLowerCase();
    
    // First try by subdomain, then fall back to custom_domain lookup
    let statusPage = await db.queryFirst<{
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
      [slug]
    );

    if (!statusPage) {
      statusPage = await db.queryFirst(
        `SELECT id, company_name, subdomain, custom_domain, logo_url, logo_link_url, contact_url, is_active
         FROM status_pages 
         WHERE custom_domain = ? AND is_active = 1`,
        [slug]
      );
    }

    if (!statusPage) {
      return null;
    }

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

        // Fetch uptime history for each resource
        const resourcesWithHistory = await Promise.all(
          resources.map(async (r) => {
            let uptimeHistory: UptimeDay[] = [];
            let uptimePercentage: number | null = null;

            if (r.show_history === 1) {
              const createdAt = r.resource_created_at || now;
              
              if (r.resource_type === 'monitor') {
                uptimeHistory = await getMonitorUptimeHistory(
                  r.resource_id,
                  ninetyDaysAgo,
                  now,
                  createdAt
                );
              } else if (r.resource_type === 'cron_job') {
                uptimeHistory = await getCronJobUptimeHistory(
                  db,
                  r.resource_id,
                  ninetyDaysAgo,
                  now,
                  createdAt
                );
              }

              // Calculate overall uptime percentage
              const monitoredDays = uptimeHistory.filter(d => d.status !== 'unknown');
              uptimePercentage = monitoredDays.length > 0
                ? monitoredDays.reduce((acc, d) => acc + d.uptimePercentage, 0) / monitoredDays.length
                : null;
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
        let sectionStatus: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' = 'operational';
        let downCount = 0;
        
        for (const r of resourcesWithHistory) {
          if (r.status === 'down') downCount++;
        }
        
        if (downCount === resourcesWithHistory.length && resourcesWithHistory.length > 0) {
          sectionStatus = 'major_outage';
        } else if (downCount > 0) {
          sectionStatus = 'partial_outage';
        }

        return {
          id: section.id,
          name: section.name,
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

    return {
      id: statusPage.id,
      companyName: statusPage.company_name,
      subdomain: statusPage.subdomain,
      customDomain: statusPage.custom_domain,
      logoUrl: statusPage.logo_url,
      logoLinkUrl: statusPage.logo_link_url,
      contactUrl: statusPage.contact_url,
      overallStatus,
      sections: sectionsWithResources,
    };
  } catch (error) {
    console.error('Failed to fetch status page:', error);
    return null;
  }
}

// Get monitor uptime history from Worker (R2 storage)
async function getMonitorUptimeHistory(
  monitorId: string,
  startTime: number,
  endTime: number,
  createdAt: number
): Promise<UptimeDay[]> {
  const workerUrl = process.env.WORKER_URL || 'https://uptime-worker.digitexa.com';
  
  try {
    const response = await fetch(
      `${workerUrl}/api/checks/${monitorId}?start_date=${startTime}&end_date=${endTime}&limit=10000`,
      { next: { revalidate: 30 } } // Cache worker response for 30 seconds
    );
    
    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }
    
    const checks: { ts: number; status: 'up' | 'down'; latency?: number }[] = await response.json();
    
    return aggregateChecksByDay(checks, startTime, endTime, createdAt);
  } catch (error) {
    console.error('Failed to fetch monitor checks from worker:', error);
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
): Promise<UptimeDay[]> {
  try {
    const runs = await db.queryAll(
      `SELECT ts, status FROM cron_runs 
       WHERE cron_job_id = ? AND ts >= ? AND ts <= ?
       ORDER BY ts ASC`,
      [cronJobId, startTime, endTime]
    ) as { ts: number; status: string }[];

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
): UptimeDay[] {
  const history: UptimeDay[] = [];
  
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
      const downtimeMinutes = dayChecks.down * 5; // Assume 5 minute check interval
      
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
): UptimeDay[] {
  const history: UptimeDay[] = [];
  
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

// Cached version of fetchStatusPageData
const getCachedStatusPageData = unstable_cache(
  async (subdomain: string) => fetchStatusPageData(subdomain),
  ['status-page-full'],
  { 
    revalidate: 30,
    tags: ['status-pages']
  }
);

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url || 'Bilinmiyor';
  }
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    return {
      title: 'Durum Sayfası Bulunamadı',
      description: 'İstenen durum sayfası bulunamadı.',
    };
  }
  
  const data = await getCachedStatusPageData(subdomain);

  if (!data) {
    return {
      title: 'Durum Sayfası Bulunamadı',
      description: 'İstenen durum sayfası bulunamadı.',
    };
  }

  const statusText = {
    operational: 'Tüm Sistemler Çalışıyor',
    degraded: 'Düşük Performans',
    partial_outage: 'Kısmi Sistem Kesintisi',
    major_outage: 'Büyük Sistem Kesintisi',
  }[data.overallStatus];

  const statusEmoji = {
    operational: '✅',
    degraded: '⚠️',
    partial_outage: '🟠',
    major_outage: '🔴',
  }[data.overallStatus];

  const pageUrl = data.customDomain 
    ? `https://${data.customDomain}`
    : `https://${data.subdomain}.uptimetr.com`;

  // SEO optimized title with status indicator
  const seoTitle = `${data.companyName} Çöktü mü? ${statusEmoji} Güncel arızalar, sorunlar ve hatalar`;
  const seoDescription = `${data.companyName}'ta yaşanan güncel arızalar, sorunlar ve hatalar. Servis ile ilgili sorun mu yaşıyorsunuz? Buradan neler olduğunu öğrenebilirsiniz.`;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: [
      `${data.companyName} çöktü mü`,
      `${data.companyName} erişim sorunu`,
      `${data.companyName} durum`,
      `${data.companyName} kesinti`,
      `${data.companyName} uptime`,
      `${data.companyName} status`,
      'site çöktü mü',
      'erişim sorunu',
      'sistem durumu',
    ],
    openGraph: {
      title: `${data.companyName} Çöktü mü? | Canlı Durum`,
      description: seoDescription,
      url: pageUrl,
      siteName: 'UptimeTR',
      type: 'website',
      locale: 'tr_TR',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.companyName} Çöktü mü? ${statusEmoji}`,
      description: seoDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: pageUrl,
    },
    other: {
      'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || '',
    },
  };
}

// Server Component
export default async function StatusPublicPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    notFound();
  }
  
  const data = await getCachedStatusPageData(subdomain);

  if (!data) {
    notFound();
  }

  // Status text for JSON-LD
  const statusText = {
    operational: 'Tüm Sistemler Çalışıyor',
    degraded: 'Düşük Performans',
    partial_outage: 'Kısmi Sistem Kesintisi',
    major_outage: 'Büyük Sistem Kesintisi',
  }[data.overallStatus];

  const pageUrl = data.customDomain 
    ? `https://${data.customDomain}`
    : `https://${data.subdomain}.uptimetr.com`;

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl,
    name: `${data.companyName} Çöktü mü? | Canlı Durum Sayfası`,
    description: `${data.companyName} çöktü mü? Anlık durum: ${statusText}. Gerçek zamanlı sistem durumu ve uptime bilgileri.`,
    url: pageUrl,
    inLanguage: 'tr-TR',
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://uptimetr.com/#website',
      name: 'UptimeTR',
      url: 'https://uptimetr.com',
    },
    about: {
      '@type': 'Organization',
      name: data.companyName,
      url: data.logoLinkUrl || pageUrl,
    },
    mainEntity: {
      '@type': 'WebApplication',
      name: `${data.companyName} Durum Sayfası`,
      applicationCategory: 'Status Page',
      operatingSystem: 'Web',
    },
    dateModified: new Date().toISOString(),
  };

  return (
    <>
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Client component - data already includes uptime history */}
      <StatusPageContent initialData={data} subdomain={subdomain} />
    </>
  );
}
