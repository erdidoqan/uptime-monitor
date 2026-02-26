'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Monitor,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface GuestMonitor {
  id: string;
  url: string;
  guest_ip: string | null;
  is_active: number;
  last_status: string | null;
  created_at: number;
  expires_at: number | null;
}

interface GuestLoadTest {
  id: string;
  url: string;
  target_url: string;
  target_concurrent_users: number;
  total_sent: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  p95: number | null;
  status: string;
  ip_address: string | null;
  created_at: number;
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

function UrlLink({ url }: { url: string }) {
  let display = url;
  try {
    const u = new URL(url);
    display = u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    // keep raw
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline truncate max-w-[260px] sm:max-w-none"
      title={url}
    >
      <span className="truncate">{display}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

function GuestsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function matchesDateFilter(ts: number, filter: 'all' | 'today' | 'yesterday') {
  if (filter === 'all') return true;
  const d = new Date(ts);
  const now = new Date();
  if (filter === 'today') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate();
}

export function AdminGuests() {
  const [guestMonitors, setGuestMonitors] = useState<GuestMonitor[]>([]);
  const [guestLoadTests, setGuestLoadTests] = useState<GuestLoadTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');
  const [monitorPage, setMonitorPage] = useState(1);
  const [loadTestPage, setLoadTestPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    api
      .get<{ guestMonitors: GuestMonitor[]; guestLoadTests: GuestLoadTest[] }>('/admin/guests')
      .then((res) => {
        setGuestMonitors(res.guestMonitors);
        setGuestLoadTests(res.guestLoadTests);
      })
      .catch((err) => console.error('Failed to fetch guests:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredMonitors = guestMonitors.filter((m) => matchesDateFilter(m.created_at, dateFilter));
  const filteredLoadTests = guestLoadTests.filter((lt) => matchesDateFilter(lt.created_at, dateFilter));

  if (loading) return <GuestsSkeleton />;

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border text-xs">
          {([['all', 'Tümü'], ['today', 'Bugün'], ['yesterday', 'Dün']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setDateFilter(value); setMonitorPage(1); setLoadTestPage(1); }}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                dateFilter === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredMonitors.length} monitör · {filteredLoadTests.length} yük testi
        </span>
      </div>

      {/* Guest Monitors */}
      <Card className="gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
          <Monitor className="h-4 w-4" />
          Misafir Monitörler
          <Badge variant="secondary" className="text-xs ml-auto">{filteredMonitors.length}</Badge>
        </div>
        <div className="px-4 py-3">
          {filteredMonitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Misafir monitör yok</p>
          ) : (
            <>
              <div className="divide-y">
                {filteredMonitors.slice((monitorPage - 1) * perPage, monitorPage * perPage).map((m) => (
                  <div key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          m.last_status === 'up' ? 'bg-green-500' : m.last_status === 'down' ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                      />
                      <UrlLink url={m.url} />
                      {!m.is_active && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pasif</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5 ml-4">
                      {m.guest_ip && <span>IP: {m.guest_ip}</span>}
                      <span>{formatDate(m.created_at)}</span>
                      {m.expires_at && (
                        <span>
                          {m.expires_at < Date.now() ? 'Süresi dolmuş' : `${formatDate(m.expires_at)}'e kadar`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {filteredMonitors.length > perPage && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {(monitorPage - 1) * perPage + 1}–{Math.min(monitorPage * perPage, filteredMonitors.length)} / {filteredMonitors.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={monitorPage <= 1} onClick={() => setMonitorPage((p) => p - 1)} className="h-8 w-8 p-0 cursor-pointer">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{monitorPage} / {Math.ceil(filteredMonitors.length / perPage)}</span>
                    <Button variant="outline" size="sm" disabled={monitorPage >= Math.ceil(filteredMonitors.length / perPage)} onClick={() => setMonitorPage((p) => p + 1)} className="h-8 w-8 p-0 cursor-pointer">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Guest Load Tests */}
      <Card className="gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b text-sm font-medium">
          <Zap className="h-4 w-4" />
          Misafir Yük Testleri
          <Badge variant="secondary" className="text-xs ml-auto">{filteredLoadTests.length}</Badge>
        </div>
        <div className="px-4 py-3">
          {filteredLoadTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Misafir yük testi yok</p>
          ) : (
            <>
              <div className="divide-y">
                {filteredLoadTests.slice((loadTestPage - 1) * perPage, loadTestPage * perPage).map((lt) => {
                  const errorRate =
                    lt.total_sent > 0
                      ? ((lt.total_errors / lt.total_sent) * 100).toFixed(1)
                      : '0';
                  const isGood = parseFloat(errorRate) < 10;
                  return (
                    <div key={lt.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {lt.status === 'completed' ? (
                          isGood ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <UrlLink url={lt.target_url || lt.url} />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1 ml-6">
                        <span>{lt.target_concurrent_users} eşzamanlı</span>
                        <span>{lt.total_sent} istek</span>
                        <span>Hata: {errorRate}%</span>
                        {lt.p95 && <span>p95: {lt.p95}ms</span>}
                        {lt.ip_address && <span>IP: {lt.ip_address}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                        {formatDate(lt.created_at)}
                        {lt.duration_sec > 0 && ` · ${Math.round(lt.duration_sec)}s`}
                      </p>
                    </div>
                  );
                })}
              </div>
              {filteredLoadTests.length > perPage && (
                <div className="flex items-center justify-between pt-3 mt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {(loadTestPage - 1) * perPage + 1}–{Math.min(loadTestPage * perPage, filteredLoadTests.length)} / {filteredLoadTests.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={loadTestPage <= 1} onClick={() => setLoadTestPage((p) => p - 1)} className="h-8 w-8 p-0 cursor-pointer">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{loadTestPage} / {Math.ceil(filteredLoadTests.length / perPage)}</span>
                    <Button variant="outline" size="sm" disabled={loadTestPage >= Math.ceil(filteredLoadTests.length / perPage)} onClick={() => setLoadTestPage((p) => p + 1)} className="h-8 w-8 p-0 cursor-pointer">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
