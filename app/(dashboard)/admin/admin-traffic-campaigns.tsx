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
  Play,
  Pause,
  Megaphone,
  Eye,
  RotateCcw,
  Activity,
} from 'lucide-react';

interface Campaign {
  id: string;
  user_id: string;
  name: string;
  url: string;
  daily_visitors: number;
  traffic_source: string;
  session_duration: string;
  use_proxy: number;
  is_active: number;
  last_run_at: number | null;
  last_status: string | null;
  total_runs: number;
  total_visits_sent: number;
  created_at: number;
  user_email: string | null;
  user_name: string | null;
}

interface Stats {
  total: number;
  active: number;
  total_runs: number;
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

export function AdminTrafficCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api
      .get<{ campaigns: Campaign[]; stats: Stats }>('/admin/traffic-campaigns')
      .then((res) => {
        setCampaigns(res.campaigns);
        setStats(res.stats);
      })
      .catch((err) => console.error('Failed to fetch traffic campaigns:', err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = campaigns.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.url.toLowerCase().includes(q) ||
      (c.user_email && c.user_email.toLowerCase().includes(q))
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
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Toplam Kampanya</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-lg font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Aktif</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-lg font-bold">{(stats.total_runs || 0).toLocaleString('tr-TR')}</p>
                <p className="text-xs text-muted-foreground">Toplam Çalışma</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
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
          placeholder="Kampanya adı, URL veya e-posta ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} / {campaigns.length} kampanya
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search ? 'Aramayla eşleşen kampanya bulunamadı.' : 'Henüz trafik kampanyası yok.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tc) => (
            <Card key={tc.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {tc.is_active ? (
                    <Play className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Pause className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{tc.name}</span>
                      {!tc.is_active && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pasif</Badge>
                      )}
                      {tc.last_status && (
                        <Badge
                          variant={tc.last_status.startsWith('error') ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tc.last_status}
                        </Badge>
                      )}
                    </div>
                    <a
                      href={tc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline truncate mt-0.5"
                    >
                      {(() => {
                        try { return new URL(tc.url).hostname; } catch { return tc.url; }
                      })()}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>{tc.daily_visitors} günlük</span>
                      <span>{tc.traffic_source}</span>
                      <span>{tc.session_duration}</span>
                      {tc.use_proxy ? <span>🇹🇷 Proxy</span> : <span>🇺🇸 Direkt</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                      <span>{tc.total_runs} çalışma</span>
                      <span>{tc.total_visits_sent} ziyaret</span>
                      {tc.user_email && (
                        <span className="text-primary">{tc.user_name || tc.user_email}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(tc.created_at)}
                      {tc.last_run_at && ` · Son: ${formatDate(tc.last_run_at)}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
