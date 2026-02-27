'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Crown, FileText, RefreshCw } from 'lucide-react';

interface CampaignUrlsProps {
  urlPool: string[] | null;
  mainUrl: string;
  updatedAt?: number | null;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export function CampaignUrls({ urlPool, mainUrl, updatedAt }: CampaignUrlsProps) {
  if (!urlPool || urlPool.length === 0) {
    return (
      <Card className="border gap-0 mb-4">
        <CardContent className="px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>Tüm trafik ana URL&apos;e gönderiliyor:</span>
            <a
              href={mainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate"
            >
              {mainUrl}
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border gap-0 mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Trafik Gönderilen Sayfalar</span>
          <Badge variant="secondary" className="text-xs">{urlPool.length}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-xs text-purple-400 font-medium">Pro</span>
        </div>
      </div>
      <CardContent className="px-5 py-3">
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {urlPool.map((url, i) => {
            let pathname = url;
            try { pathname = new URL(url).pathname; } catch {}
            return (
              <div key={i} className="flex items-center gap-2 text-sm group">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-muted-foreground hover:text-foreground transition-colors"
                  title={url}
                >
                  {pathname}
                </a>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Her ziyaretçi bu sayfalardan rastgele birine yönlendirilir.
          </p>
          {updatedAt && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 ml-4">
              <RefreshCw className="h-3 w-3" />
              <span>{formatRelativeTime(updatedAt)}</span>
              <span className="hidden sm:inline">· 6 saatte bir otomatik güncellenir</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
