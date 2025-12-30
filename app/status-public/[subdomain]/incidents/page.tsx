import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getD1Client } from '@/lib/d1-client';
import { IncidentsContent } from './incidents-content';

// Revalidate every 30 seconds
export const revalidate = 30;

interface StatusPageBasic {
  id: string;
  companyName: string;
  subdomain: string;
  customDomain: string | null;
  logoUrl: string | null;
  logoLinkUrl: string | null;
  contactUrl: string | null;
}

interface Incident {
  id: string;
  type: 'monitor' | 'cron_job';
  sourceId: string;
  sourceName: string;
  startedAt: number;
  resolvedAt: number | null;
  duration: number | null; // in minutes
}

async function fetchStatusPageWithIncidents(subdomain: string): Promise<{
  statusPage: StatusPageBasic;
  incidents: Incident[];
} | null> {
  try {
    if (!subdomain || typeof subdomain !== 'string') {
      return null;
    }
    
    const db = getD1Client();

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
      return null;
    }

    // Get all resource IDs from this status page
    const resources = await db.queryAll<{
      resource_type: string;
      resource_id: string;
      resource_name: string | null;
    }>(
      `SELECT 
        spr.resource_type,
        spr.resource_id,
        CASE 
          WHEN spr.resource_type = 'monitor' THEN m.name
          WHEN spr.resource_type = 'cron_job' THEN c.name
        END as resource_name
      FROM status_page_resources spr
      JOIN status_page_sections sps ON spr.section_id = sps.id
      LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
      LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
      WHERE sps.status_page_id = ?`,
      [statusPage.id]
    );

    if (!resources || resources.length === 0) {
      return {
        statusPage: {
          id: statusPage.id,
          companyName: statusPage.company_name,
          subdomain: statusPage.subdomain,
          customDomain: statusPage.custom_domain,
          logoUrl: statusPage.logo_url,
          logoLinkUrl: statusPage.logo_link_url,
          contactUrl: statusPage.contact_url,
        },
        incidents: [],
      };
    }

    // Build resource map for quick lookup
    const resourceMap = new Map<string, { type: string; name: string }>();
    for (const r of resources) {
      resourceMap.set(`${r.resource_type}-${r.resource_id}`, {
        type: r.resource_type,
        name: r.resource_name || 'Unknown',
      });
    }

    // Get resolved incidents for these resources (last 90 days)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const monitorIds = resources.filter(r => r.resource_type === 'monitor').map(r => r.resource_id);
    const cronIds = resources.filter(r => r.resource_type === 'cron_job').map(r => r.resource_id);

    const incidents: Incident[] = [];

    // Fetch monitor incidents
    if (monitorIds.length > 0) {
      const placeholders = monitorIds.map(() => '?').join(',');
      const monitorIncidents = await db.queryAll<{
        id: string;
        type: string;
        source_id: string;
        started_at: number;
        resolved_at: number | null;
      }>(
        `SELECT id, type, source_id, started_at, resolved_at 
         FROM incidents 
         WHERE type = 'monitor' 
         AND source_id IN (${placeholders})
         AND resolved_at IS NOT NULL
         AND started_at >= ?
         ORDER BY started_at DESC`,
        [...monitorIds, ninetyDaysAgo]
      );

      for (const inc of monitorIncidents as any[]) {
        const resource = resourceMap.get(`monitor-${inc.source_id}`);
        if (resource) {
          const duration = inc.resolved_at 
            ? Math.round((inc.resolved_at - inc.started_at) / 60000)
            : null;
          incidents.push({
            id: inc.id,
            type: 'monitor',
            sourceId: inc.source_id,
            sourceName: resource.name,
            startedAt: inc.started_at,
            resolvedAt: inc.resolved_at,
            duration,
          });
        }
      }
    }

    // Fetch cron job incidents
    if (cronIds.length > 0) {
      const placeholders = cronIds.map(() => '?').join(',');
      const cronIncidents = await db.queryAll<{
        id: string;
        type: string;
        source_id: string;
        started_at: number;
        resolved_at: number | null;
      }>(
        `SELECT id, type, source_id, started_at, resolved_at 
         FROM incidents 
         WHERE type = 'cron_job' 
         AND source_id IN (${placeholders})
         AND resolved_at IS NOT NULL
         AND started_at >= ?
         ORDER BY started_at DESC`,
        [...cronIds, ninetyDaysAgo]
      );

      for (const inc of cronIncidents as any[]) {
        const resource = resourceMap.get(`cron_job-${inc.source_id}`);
        if (resource) {
          const duration = inc.resolved_at 
            ? Math.round((inc.resolved_at - inc.started_at) / 60000)
            : null;
          incidents.push({
            id: inc.id,
            type: 'cron_job',
            sourceId: inc.source_id,
            sourceName: resource.name,
            startedAt: inc.started_at,
            resolvedAt: inc.resolved_at,
            duration,
          });
        }
      }
    }

    // Sort by started_at descending
    incidents.sort((a, b) => b.startedAt - a.startedAt);

    return {
      statusPage: {
        id: statusPage.id,
        companyName: statusPage.company_name,
        subdomain: statusPage.subdomain,
        customDomain: statusPage.custom_domain,
        logoUrl: statusPage.logo_url,
        logoLinkUrl: statusPage.logo_link_url,
        contactUrl: statusPage.contact_url,
      },
      incidents,
    };
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return null;
  }
}

const getCachedData = unstable_cache(
  async (subdomain: string) => fetchStatusPageWithIncidents(subdomain),
  ['status-page-incidents'],
  { revalidate: 30, tags: ['status-pages', 'incidents'] }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    return {
      title: 'Status Page Not Found',
    };
  }
  
  const data = await getCachedData(subdomain);

  if (!data) {
    return {
      title: 'Status Page Not Found',
    };
  }

  return {
    title: `Previous Incidents | ${data.statusPage.companyName} Status`,
    description: `View past incidents and their resolution times for ${data.statusPage.companyName}.`,
  };
}

export default async function IncidentsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    notFound();
  }
  
  const data = await getCachedData(subdomain);

  if (!data) {
    notFound();
  }

  return (
    <IncidentsContent 
      statusPage={data.statusPage} 
      incidents={data.incidents}
      subdomain={subdomain} 
    />
  );
}





