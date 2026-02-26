'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import type { StatusPage } from '@/shared/types';
import { SettingsTab } from './settings-tab';
import { StructureTab } from './structure-tab';
import { StatusUpdatesTab } from './status-updates-tab';
import { MaintenanceTab } from './maintenance-tab';
import { SubscribersTab } from './subscribers-tab';
import { TranslationsTab } from './translations-tab';

type TabType = 'settings' | 'structure' | 'status-updates' | 'maintenance' | 'subscribers' | 'translations';

const tabs: { id: TabType; label: string }[] = [
  { id: 'settings', label: 'Ayarlar' },
  { id: 'structure', label: 'Yapı' },
  { id: 'status-updates', label: 'Durum güncellemeleri' },
  { id: 'maintenance', label: 'Bakım' },
  { id: 'subscribers', label: 'Aboneler' },
  { id: 'translations', label: 'Çeviriler' },
];

interface StatusPageEditProps {
  statusPageId: string;
}

export function StatusPageEdit({ statusPageId }: StatusPageEditProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [statusPage, setStatusPage] = useState<StatusPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Load status page data - wait for session to be ready first
  useEffect(() => {
    // Don't fetch until session is loaded (token will be in localStorage)
    if (sessionStatus === 'loading') {
      return;
    }

    const loadStatusPage = async () => {
      try {
        const data = await api.get<StatusPage>(`/status-pages/${statusPageId}`);
        setStatusPage(data);
      } catch (err: any) {
        console.error('Failed to load status page:', err);
        setError(err.message || 'Durum sayfası yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    loadStatusPage();
  }, [statusPageId, sessionStatus]);

  // Show success message only when created=true query param exists
  useEffect(() => {
    if (searchParams.get('created') === 'true') {
      setShowSuccessMessage(true);
      // Remove query param from URL without refresh
      router.replace(`/status-pages/${statusPageId}/edit`, { scroll: false });
    }
  }, [searchParams, router, statusPageId]);

  const handleStatusPageUpdate = (updatedStatusPage: StatusPage) => {
    setStatusPage(updatedStatusPage);
  };

  const pageUrl = statusPage?.custom_domain 
    ? `https://${statusPage.custom_domain}`
    : statusPage ? `https://${statusPage.subdomain}.uptimetr.com` : '';

  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px]">
      {/* Breadcrumb - always visible */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link href="/status-pages" className="text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Durum sayfaları
        </Link>
        <span className="text-muted-foreground">{'>'}</span>
        {loading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <span className="text-muted-foreground">
            {statusPage?.custom_domain || `${statusPage?.subdomain}.uptimetr.com`}
          </span>
        )}
      </div>

      {/* Title - always visible */}
      <div className="mb-4 flex items-center gap-2">
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <>
            <h1 className="text-2xl font-semibold">
              {statusPage?.custom_domain || `${statusPage?.subdomain}.uptimetr.com`}
            </h1>
            <a 
              href={pageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </>
        )}
      </div>

      {/* Success message */}
      {showSuccessMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-200">
                Durum sayfası başarıyla oluşturuldu.
              </p>
              <a 
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Önizle
              </a>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessMessage(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs - always visible */}
      <div className="border-b mb-8">
        <nav className="flex gap-0" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content - progressive loading */}
      <div>
        {activeTab === 'settings' && (
          loading ? (
            <SettingsTabSkeleton />
          ) : statusPage ? (
            <SettingsTab 
              statusPage={statusPage} 
              onUpdate={handleStatusPageUpdate} 
            />
          ) : null
        )}
        {activeTab === 'structure' && (
          <StructureTab statusPageId={statusPageId} />
        )}
        {activeTab === 'status-updates' && <StatusUpdatesTab />}
        {activeTab === 'maintenance' && <MaintenanceTab />}
        {activeTab === 'subscribers' && <SubscribersTab />}
        {activeTab === 'translations' && <TranslationsTab />}
      </div>
    </div>
  );
}

// Settings tab skeleton
function SettingsTabSkeleton() {
  return (
    <div className="space-y-12">
      {/* Basic information skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
      
      {/* Links skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
