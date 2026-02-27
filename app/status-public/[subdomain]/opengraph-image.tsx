import { ImageResponse } from 'next/og';
import { getD1Client } from '@/lib/d1-client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Image metadata
export const runtime = 'nodejs';
export const alt = 'Status Page';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Cache OG image for 1 hour
export const revalidate = 3600;

// UptimeTR logo - read at module load time
let uptimeTRLogoBase64: string | null = null;
try {
  const logoPath = join(process.cwd(), 'public', 'android-chrome-192x192.png');
  const logoBuffer = readFileSync(logoPath);
  uptimeTRLogoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
} catch (e) {
  console.error('Failed to load UptimeTR logo:', e);
}

// Fetch external image and convert to base64 with timeout and size limit
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    // Skip if URL is empty or invalid
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return null;
    }

    // Create abort controller for timeout (5 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'image/*' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    // Check content length - skip if larger than 500KB
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 500000) {
      console.log('Image too large, skipping:', url);
      return null;
    }
    
    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = await response.arrayBuffer();
    
    // Double check buffer size
    if (buffer.byteLength > 500000) {
      console.log('Image buffer too large, skipping');
      return null;
    }
    
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    // Silently fail - don't crash OG image generation
    console.error('Failed to fetch image:', e);
    return null;
  }
}

// Fallback image generator
function createFallbackImage(title: string = 'Status Page') {
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
            display: 'flex',
            fontSize: '64px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: '40px',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            color: '#64748b',
          }}
        >
          <span>Powered by</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '22px',
              background: 'linear-gradient(90deg, #a855f7 0%, #06b6d4 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            UptimeTR
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

// Generate dynamic OG image
export default async function Image({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  try {
    const { subdomain } = await params;
    
    // Validate subdomain
    if (!subdomain || typeof subdomain !== 'string') {
      return createFallbackImage();
    }
  
  let companyName = subdomain;
  let overallStatus = 'unknown';
  let resourceCount = 0;
  let logoUrl: string | null = null;
  let logoBase64: string | null = null;
  
  try {
    const db = getD1Client();
    
    const slug = subdomain.toLowerCase();
    let statusPage = await db.queryFirst<{
      id: string;
      company_name: string;
      logo_url: string | null;
    }>(
      `SELECT id, company_name, logo_url FROM status_pages WHERE subdomain = ? AND is_active = 1`,
      [slug]
    );
    if (!statusPage) {
      statusPage = await db.queryFirst(
        `SELECT id, company_name, logo_url FROM status_pages WHERE custom_domain = ? AND is_active = 1`,
        [slug]
      );
    }
    
    if (statusPage) {
      companyName = statusPage.company_name;
      logoUrl = statusPage.logo_url;
      
      // Fetch company logo if available
      if (logoUrl) {
        logoBase64 = await fetchImageAsBase64(logoUrl);
      }
      
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
    operational: { bg: '#059669', text: 'Tüm Servisler Çalışıyor' },
    partial_outage: { bg: '#ea580c', text: 'Kısmi Kesinti' },
    major_outage: { bg: '#dc2626', text: 'Büyük Kesinti' },
    unknown: { bg: '#64748b', text: 'Durum Bilinmiyor' },
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
            display: 'flex',
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
            gap: '24px',
          }}
        >
          {/* Company logo */}
          {logoBase64 && (
            <img
              src={logoBase64}
              alt=""
              style={{
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                borderRadius: '16px',
              }}
            />
          )}

          {/* Company name */}
          <div
            style={{
              display: 'flex',
              fontSize: '56px',
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              maxWidth: '900px',
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
              padding: '18px 36px',
              borderRadius: '16px',
              background: status.bg,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                display: 'flex',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
              }}
            />
            <span
              style={{
                fontSize: '28px',
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
                display: 'flex',
                fontSize: '22px',
                color: '#94a3b8',
              }}
            >
              {resourceCount} servis izleniyor
            </div>
          )}
        </div>

        {/* Footer - Powered by UptimeTR */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '20px',
            color: '#64748b',
          }}
        >
          <span>Powered by</span>
          {uptimeTRLogoBase64 && (
            <img
              src={uptimeTRLogoBase64}
              alt=""
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
              }}
            />
          )}
          <span
            style={{
              fontWeight: 700,
              fontSize: '22px',
              background: 'linear-gradient(90deg, #a855f7 0%, #06b6d4 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            UptimeTR
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
  } catch (error) {
    console.error('OG image generation failed:', error);
    return createFallbackImage();
  }
}





