"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/landing";



/* ───────── Types ───────── */

interface TestSummary {
  id: string;
  url: string;
  target_url: string;
  target_concurrent_users: number;
  total_sent: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  rps: number;
  p50: number | null;
  p95: number | null;
  stopped_reason: string | null;
  status: string;
  created_at: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const POLAR_CHECKOUT_URL =
  "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o";

async function openPolarCheckout() {
  try {
    const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
    await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: "dark" });
  } catch {
    window.open(POLAR_CHECKOUT_URL, "_blank");
  }
}

/* ───────── Page Component ───────── */

export default function LoadTestHistoryPage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/load-test/history?page=${p}`);
      if (!res.ok) {
        if (res.status === 401) {
          setIsAuth(false);
          return;
        }
        throw new Error("Geçmiş alınamadı");
      }
      setIsAuth(true);
      const data = await res.json();
      setTests(data.tests || []);
      setPagination(data.pagination || null);
    } catch {
      setError("Test geçmişi yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(page);
  }, [page, fetchHistory]);

  const errorRate = (t: TestSummary) =>
    t.total_sent > 0 ? ((t.total_errors / t.total_sent) * 100).toFixed(1) : "0";

  const statusBadge = (t: TestSummary) => {
    if (t.status === "running") return { text: "Devam ediyor", cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
    if (t.status === "abandoned") return { text: "Tamamlanamadı", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    const er = t.total_sent > 0 ? t.total_errors / t.total_sent : 0;
    if (er > 0.5) return { text: "Başarısız", cls: "bg-red-500/20 text-red-300 border-red-500/30" };
    if (er > 0.1) return { text: "Kısmen başarılı", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
    return { text: "Başarılı", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          {/* Başlık */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/load-test"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Yük Testi
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Test Geçmişi
            </h1>
            <p className="text-gray-400 mt-1">Geçmiş yük test sonuçlarınız</p>
          </div>

          {/* Auth olmayan kullanıcı */}
          {isAuth === false && (
            <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30">
                <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div className="text-center max-w-md">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Giriş yapın
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Test geçmişinizi görmek için giriş yapmanız gerekiyor.
                </p>
                <Link
                  href="/login?callbackUrl=/load-test/history"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm hover:bg-white/20 transition-colors"
                >
                  Giriş Yap
                </Link>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && isAuth !== false && (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-white/5 rounded-xl border border-white/10" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Boş sonuç */}
          {!loading && isAuth && tests.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-4xl">🧪</span>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-1">Henüz test yok</h3>
                <p className="text-sm text-gray-400 mb-4">İlk yük testinizi başlatın!</p>
                <Link
                  href="/load-test"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:from-purple-600 hover:to-pink-600 transition-colors"
                >
                  Yük Testi Başlat
                </Link>
              </div>
            </div>
          )}

          {/* Test listesi */}
          {!loading && tests.length > 0 && (
            <div className="space-y-3">
              {tests.map((t) => {
                const badge = statusBadge(t);
                const displayUrl = t.target_url || t.url;
                return (
                  <Link
                    key={t.id}
                    href={`/load-test/${t.id}`}
                    className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.cls}`}>
                            {badge.text}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(t.created_at).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="text-sm text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                          {displayUrl}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                        <div className="text-center">
                          <div className="text-white font-medium">{t.target_concurrent_users}</div>
                          <div>eşzamanlı</div>
                        </div>
                        <div className="text-center">
                          <div className="text-white font-medium">{t.total_sent.toLocaleString("tr-TR")}</div>
                          <div>istek</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-medium ${Number(errorRate(t)) > 10 ? "text-red-400" : "text-emerald-400"}`}>
                            {errorRate(t)}%
                          </div>
                          <div>hata</div>
                        </div>
                        <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Önceki
                  </button>
                  <span className="text-xs text-gray-500">
                    {page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Sonraki
                  </button>
                </div>
              )}

              {/* Pro CTA */}
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/20">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white mb-1">
                      Pro ile sınırsız test + detaylı raporlar
                    </h3>
                    <p className="text-sm text-gray-400">
                      10.000 eşzamanlı kullanıcıya kadar test, AI analizi, performans grafikleri ve tam arşiv erişimi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
                    className="shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:from-purple-600 hover:to-pink-600 transition-colors cursor-pointer shadow-lg shadow-purple-500/25"
                  >
                    Pro Planına Geç — $5/ay
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
