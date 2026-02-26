import { getD1Client } from '@/lib/d1-client';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// Escape special XML characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  try {
    const db = getD1Client();
    const baseUrl = 'https://www.uptimetr.com';

    // Get all active status pages with logo
    const statusPages = await db.queryAll<{
      id: string;
      company_name: string;
      subdomain: string;
      custom_domain: string | null;
      logo_url: string | null;
      created_at: number;
      updated_at: number;
    }>(
      `SELECT id, company_name, subdomain, custom_domain, logo_url, created_at, updated_at
       FROM status_pages 
       WHERE is_active = 1 
       ORDER BY created_at DESC`
    );

    const now = new Date().toUTCString();

    // Build RSS XML
    const rssItems = statusPages.map((page) => {
      // URL format: https://{subdomain}.uptimetr.com or custom domain
      const pageUrl = page.custom_domain 
        ? `https://${page.custom_domain}`
        : `https://${page.subdomain}.uptimetr.com`;
      
      const ogImageUrl = `https://${page.subdomain}.uptimetr.com/opengraph-image`;
      const pubDate = new Date(page.created_at).toUTCString();

      // Logo enclosure (if available)
      const logoEnclosure = page.logo_url 
        ? `\n      <enclosure url="${escapeXml(page.logo_url)}" type="image/png" length="0"/>`
        : '';

      // Title format same as status page: "{company} Çöktü mü? ✅ Güncel arızalar, sorunlar ve hatalar"
      const title = `${page.company_name} Çöktü mü? ✅ Güncel arızalar, sorunlar ve hatalar`;
      const description = `${page.company_name}'ta yaşanan güncel arızalar, sorunlar ve hatalar. Servis ile ilgili sorun mu yaşıyorsunuz? Buradan neler olduğunu öğrenebilirsiniz.`;

      return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${pageUrl}</link>
      <guid isPermaLink="true">${pageUrl}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>Durum Sayfası</category>
      <media:content url="${ogImageUrl}" type="image/png" width="1200" height="630" medium="image"/>
      <media:thumbnail url="${ogImageUrl}" width="1200" height="630"/>${logoEnclosure}
    </item>`;
    }).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>UptimeTR - Durum Sayfaları</title>
    <link>${baseUrl}</link>
    <description>UptimeTR üzerinde yayınlanan tüm durum sayfalarının listesi. Servislerin anlık durumlarını takip edin.</description>
    <language>tr-TR</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/status-pages.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/android-chrome-512x512.png</url>
      <title>UptimeTR - Durum Sayfaları</title>
      <link>${baseUrl}</link>
    </image>
    <ttl>60</ttl>
${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('RSS feed error:', error);
    
    // Return empty feed on error
    const errorRss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>UptimeTR - Durum Sayfaları</title>
    <link>https://www.uptimetr.com</link>
    <description>Durum sayfaları yüklenirken bir hata oluştu.</description>
  </channel>
</rss>`;

    return new Response(errorRss, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}
