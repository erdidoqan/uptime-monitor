'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  MousePointerClick,
  Eye,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface BrowserTest {
  id: string;
  user_id: string | null;
  url: string;
  target_url: string;
  target_browsers: number;
  tabs_per_browser: number;
  total_visits: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  status: string;
  stopped_reason: string | null;
  ip_address: string | null;
  created_at: number;
  user_email: string | null;
  user_name: string | null;
}

interface Stats {
  total: number;
  running: number;
  completed: number;
  total_visits: number;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminBrowserTests() {
  const [tests, setTests] = useState<BrowserTest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get<{ tests: BrowserTest[]; stats: Stats }>('/admin/browser-tests')
      .then((res) => {
        setTests(res.tests);
        setStats(res.stats);
      })
      .catch((err) => console.error('Failed to fetch browser tests:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tests.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.url.toLowerCase().includes(q) ||
      t.target_url.toLowerCase().includes(q) ||
      (t.user_email && t.user_email.toLowerCase().includes(q)) ||
      (t.ip_address && t.ip_address.includes(q))
    );
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Test</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{stats.running}</p>
                <p className="text-xs text-muted-foreground">Çalışan</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Tamamlanan</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{(stats.total_visits || 0).toLocaleString('tr-TR')}</p>
                <p className="text-xs text-muted-foreground">Toplam Ziyaret</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="URL, e-posta veya IP ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} / {tests.length} test (son 100)
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search ? 'Aramayla eşleşen test bulunamadı.' : 'Henüz browser test yok.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((bt) => {
            const targetVisits = bt.target_browsers * bt.tabs_per_browser;
            return (
              <Card key={bt.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {bt.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : bt.status === 'running' ? (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                    ) : bt.status === 'failed' || bt.status === 'abandoned' ? (
                      <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={bt.target_url || bt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline truncate"
                        >
                          {(() => {
                            try { return new URL(bt.target_url || bt.url).hostname; } catch { return bt.url; }
                          })()}
                        </a>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {bt.status}
                        </Badge>
                        {bt.stopped_reason && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {bt.stopped_reason}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span>{bt.target_browsers}×{bt.tabs_per_browser} = {targetVisits} hedef</span>
                        <span>{bt.total_ok}/{bt.total_visits || targetVisits} başarılı</span>
                        {bt.total_errors > 0 && <span className="text-red-400">{bt.total_errors} hata</span>}
                        {bt.duration_sec > 0 && <span>{Math.round(bt.duration_sec)}s</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span>{formatDate(bt.created_at)}</span>
                        {bt.user_email ? (
                          <span className="text-primary">{bt.user_name || bt.user_email}</span>
                        ) : (
                          <span>Misafir</span>
                        )}
                        {bt.ip_address && <span>IP: {bt.ip_address}</span>}
                      </div>
                    </div>
                    <a
                      href={`/browser-test/${bt.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
