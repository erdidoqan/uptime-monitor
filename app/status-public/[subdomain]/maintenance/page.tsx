import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getD1Client } from '@/lib/d1-client';
import { MaintenanceContent } from './maintenance-content';

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

async function fetchStatusPageBasic(subdomain: string): Promise<StatusPageBasic | null> {
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

    return {
      id: statusPage.id,
      companyName: statusPage.company_name,
      subdomain: statusPage.subdomain,
      customDomain: statusPage.custom_domain,
      logoUrl: statusPage.logo_url,
      logoLinkUrl: statusPage.logo_link_url,
      contactUrl: statusPage.contact_url,
    };
  } catch (error) {
    console.error('Failed to fetch status page:', error);
    return null;
  }
}

const getCachedStatusPageBasic = unstable_cache(
  async (subdomain: string) => fetchStatusPageBasic(subdomain),
  ['status-page-basic'],
  { revalidate: 30, tags: ['status-pages'] }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    return {
      title: 'Durum Sayfası Bulunamadı',
    };
  }
  
  const data = await getCachedStatusPageBasic(subdomain);

  if (!data) {
    return {
      title: 'Durum Sayfası Bulunamadı',
    };
  }

  const pageUrl = data.customDomain 
    ? `https://${data.customDomain}/maintenance`
    : `https://${data.subdomain}.uptimetr.com/maintenance`;

  const seoTitle = `${data.companyName} Planlı Bakım | Bakım Takvimi`;
  const seoDescription = `${data.companyName} planlı bakım çalışmaları ve bakım takvimi. Yaklaşan bakım pencereleri ve sistem güncelleme bilgileri.`;

  return {
    title: seoTitle,
    description: seoDescription,
    keywords: [
      `${data.companyName} bakım`,
      `${data.companyName} planlı bakım`,
      `${data.companyName} maintenance`,
      `${data.companyName} güncelleme`,
      'planlı bakım',
      'bakım takvimi',
    ],
    openGraph: {
      title: seoTitle,
      description: seoDescription,
      url: pageUrl,
      siteName: 'UptimeTR',
      type: 'website',
      locale: 'tr_TR',
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  
  if (!subdomain || typeof subdomain !== 'string') {
    notFound();
  }
  
  const data = await getCachedStatusPageBasic(subdomain);

  if (!data) {
    notFound();
  }

  return <MaintenanceContent statusPage={data} subdomain={subdomain} />;
}





