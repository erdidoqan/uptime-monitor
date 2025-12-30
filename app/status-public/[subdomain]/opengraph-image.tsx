import { ImageResponse } from 'next/og';
import { getD1Client } from '@/lib/d1-client';

// Image metadata
export const runtime = 'nodejs';
export const alt = 'Status Page';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Generate dynamic OG image
export default async function Image({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  // Validate subdomain
  if (!subdomain || typeof subdomain !== 'string') {
    // Return default image if subdomain is invalid
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
            }}
          >
            Status Page
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
  
  let companyName = subdomain;
  let overallStatus = 'unknown';
  let resourceCount = 0;
  
  try {
    const db = getD1Client();
    
    const statusPage = await db.queryFirst<{
      id: string;
      company_name: string;
    }>(
      `SELECT id, company_name FROM status_pages WHERE subdomain = ? AND is_active = 1`,
      [subdomain.toLowerCase()]
    );
    
    if (statusPage) {
      companyName = statusPage.company_name;
      
      // Count resources
      const result = await db.queryFirst<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM status_page_resources spr
         JOIN status_page_sections sps ON spr.section_id = sps.id
         WHERE sps.status_page_id = ?`,
        [statusPage.id]
      );
      resourceCount = result?.count || 0;
      
      // Check overall status
      const downCount = await db.queryFirst<{ count: number }>(
        `SELECT COUNT(*) as count 
         FROM status_page_resources spr
         JOIN status_page_sections sps ON spr.section_id = sps.id
         LEFT JOIN monitors m ON spr.resource_type = 'monitor' AND spr.resource_id = m.id
         LEFT JOIN cron_jobs c ON spr.resource_type = 'cron_job' AND spr.resource_id = c.id
         WHERE sps.status_page_id = ?
         AND (
           (spr.resource_type = 'monitor' AND m.last_status = 'down')
           OR (spr.resource_type = 'cron_job' AND c.last_status = 'down')
         )`,
        [statusPage.id]
      );
      
      if (downCount?.count === 0) {
        overallStatus = 'operational';
      } else if (downCount?.count === resourceCount) {
        overallStatus = 'major_outage';
      } else {
        overallStatus = 'partial_outage';
      }
    }
  } catch (error) {
    console.error('OG image generation error:', error);
  }
  
  const statusColors = {
    operational: { bg: '#059669', text: 'All Systems Operational' },
    partial_outage: { bg: '#ea580c', text: 'Partial Outage' },
    major_outage: { bg: '#dc2626', text: 'Major Outage' },
    unknown: { bg: '#64748b', text: 'Status Unknown' },
  };
  
  const status = statusColors[overallStatus as keyof typeof statusColors] || statusColors.unknown;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.03,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '32px',
          }}
        >
          {/* Company name */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
            }}
          >
            {companyName}
          </div>

          {/* Status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px 40px',
              borderRadius: '16px',
              background: status.bg,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'white',
              }}
            />
            <span
              style={{
                fontSize: '32px',
                fontWeight: 600,
                color: 'white',
              }}
            >
              {status.text}
            </span>
          </div>

          {/* Resource count */}
          {resourceCount > 0 && (
            <div
              style={{
                fontSize: '24px',
                color: '#94a3b8',
              }}
            >
              Monitoring {resourceCount} service{resourceCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '20px',
            color: '#64748b',
          }}
        >
          <span>Powered by</span>
          <span
            style={{
              fontWeight: 600,
              background: 'linear-gradient(90deg, #34d399 0%, #2dd4bf 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            CronUptime
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}





