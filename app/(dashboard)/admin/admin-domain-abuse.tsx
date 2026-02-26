'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, ExternalLink, ShieldBan, Ban, Loader2, CheckCircle } from 'lucide-react';

interface DomainAbuseUser {
  user_id: string;
  email: string;
  name: string | null;
  is_banned: number;
  test_count: number;
  latest_test: number;
}

interface DomainAbuse {
  domain: string;
  userCount: number;
  testCount: number;
  latestTest: number;
  users: DomainAbuseUser[];
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

function AbuseSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminDomainAbuse() {
  const [domains, setDomains] = useState<DomainAbuse[]>([]);
  const [loading, setLoading] = useState(true);
  const [banningDomain, setBanningDomain] = useState<string | null>(null);
  const [bannedDomains, setBannedDomains] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{ domains: DomainAbuse[] }>('/admin/domain-abuse')
      .then((res) => setDomains(res.domains))
      .catch((err) => console.error('Failed to fetch domain abuse:', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleBanAll(domain: string) {
    if (!confirm(`"${domain}" domainine istek atan tüm kullanıcıları ve IP adreslerini banlamak istediğinize emin misiniz?`)) {
      return;
    }
    setBanningDomain(domain);
    try {
      const res = await api.post<{ bannedUsers: number; bannedIps: number }>('/admin/domain-abuse/ban-all', { domain });
      setBannedDomains((prev) => new Set(prev).add(domain));
      setDomains((prev) =>
        prev.map((d) =>
          d.domain === domain
            ? { ...d, users: d.users.map((u) => ({ ...u, is_banned: 1 })) }
            : d
        )
      );
      alert(`${res.bannedUsers} kullanıcı ve ${res.bannedIps} IP adresi banlandı.`);
    } catch (err) {
      console.error('Ban all failed:', err);
      alert('Ban işlemi başarısız oldu.');
    } finally {
      setBanningDomain(null);
    }
  }

  if (loading) return <AbuseSkeleton />;

  const allBanned = (d: DomainAbuse) => d.users.every((u) => !!u.is_banned);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {domains.length} domain birden fazla kullanıcı tarafından test edilmiş
      </p>

      {domains.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Birden fazla kullanıcının test ettiği domain bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <Card key={d.domain} className="gap-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`https://${d.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  {d.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {allBanned(d) || bannedDomains.has(d.domain) ? (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Tümü banlı
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={banningDomain === d.domain}
                      onClick={(e) => {
                        e.preventDefault();
                        handleBanAll(d.domain);
                      }}
                    >
                      {banningDomain === d.domain ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      Tümünü banla
                    </Button>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {d.userCount} kullanıcı
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {d.testCount} test
                  </Badge>
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="divide-y">
                  {d.users.map((u) => (
                    <div key={u.user_id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{u.name || u.email}</span>
                          {!!u.is_banned && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5">
                              <ShieldBan className="h-3 w-3" />
                              Banlı
                            </Badge>
                          )}
                        </div>
                        {u.name && (
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium">{u.test_count} test</div>
                        <div className="text-xs text-muted-foreground">{formatDate(u.latest_test)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
