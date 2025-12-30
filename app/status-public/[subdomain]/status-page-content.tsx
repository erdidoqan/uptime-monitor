'use client';

import { useState, useEffect } from 'react';
import { StatusHeader } from './status-header';
import { StatusBanner } from './status-banner';
import { StatusSection } from './status-section';
import { StatusFooter } from './status-footer';

interface UptimeDay {
  date: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  uptimePercentage: number;
  downtimeMinutes: number;
}

interface Resource {
  id: string;
  type: string;
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

interface StatusPageContentProps {
  initialData: StatusPageData;
  subdomain: string;
}

export function StatusPageContent({ initialData, subdomain }: StatusPageContentProps) {
  // Data comes from server with full uptime history - no need to fetch on mount
  const [data, setData] = useState<StatusPageData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Polling - refresh every 60 seconds for real-time updates
  // Data is already cached on server, so this is lightweight
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsRefreshing(true);
        const response = await fetch(`/api/public/status-pages/${subdomain}`);
        if (response.ok) {
          const newData = await response.json();
          setData(newData);
        }
      } catch (error) {
        console.error('Failed to refresh status:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Poll every 60 seconds (server cache is 30s, so this catches updates)
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, [subdomain]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <StatusHeader
        companyName={data.companyName}
        subdomain={subdomain}
        logoUrl={data.logoUrl}
        logoLinkUrl={data.logoLinkUrl}
        contactUrl={data.contactUrl}
      />

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overall status banner */}
        <StatusBanner
          status={data.overallStatus}
          isRefreshing={isRefreshing}
        />

        {/* Sections */}
        <div className="mt-8 space-y-4">
          {data.sections.map((section, index) => (
            <StatusSection 
              key={section.id} 
              section={section}
              defaultExpanded={index === 0}
            />
          ))}
        </div>

      </main>

      {/* Footer */}
      <StatusFooter />
    </div>
  );
}
