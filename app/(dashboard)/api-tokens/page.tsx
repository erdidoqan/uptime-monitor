import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-api-client';
import { ApiError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import type { ApiToken } from '@/shared/types';
import { ApiTokenList } from './api-token-list';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

async function getApiTokensData(): Promise<ApiToken[]> {
  try {
    const tokens = await serverApi.get<ApiToken[]>('/api-tokens');
    return tokens;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }
    console.error('Failed to load API tokens:', error);
    return [];
  }
}

function ApiTokenListSkeleton() {
  return (
    <Card className="border">
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-5 animate-pulse">
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-6 w-20 rounded" />
              </div>
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function ApiTokensListWrapper() {
  const tokens = await getApiTokensData();
  return <ApiTokenList initialTokens={tokens} />;
}

export default function ApiTokensPage() {
  return (
    <div className="flex flex-col mx-auto px-5 py-8 lg:pt-20 max-w-[1040px] h-[calc(100%-52px)]">
      {/* Header - always visible */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">API Token&apos;ları</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programatik erişim için API token&apos;larınızı yönetin
          </p>
        </div>
        <Link
          href="/api-docs"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
        >
          <span>API Dokümantasyonu</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* Token list - progressive loading */}
      <Suspense fallback={<ApiTokenListSkeleton />}>
        <ApiTokensListWrapper />
      </Suspense>
    </div>
  );
}
