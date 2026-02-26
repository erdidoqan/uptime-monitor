"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { LoadTestReport, LoadTestFormCard } from "@/components/load-test";
import type { LoadTestReportData, RampStepResult } from "@/components/load-test/load-test-helpers";
import { useLoadTest } from "@/hooks/use-load-test";
import { api } from "@/lib/api-client";
import type { SeoInfo } from "@/lib/load-test-analyze";

/* ───────── Types ───────── */

export interface LoadTestData {
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
  p99: number | null;
  error_reasons: Record<string, number> | null;
  ramp_steps: Array<{
    concurrentUsers: number;
    actualConcurrency: number;
    sent: number;
    ok: number;
    errors: number;
    errorRate: number;
    rps: number;
    p50: number;
    p95: number;
    p99: number;
    durationSec: number;
    errorReasons?: Record<string, number>;
  }>;
  stopped_reason: string | null;
  ai_analysis: string | null;
  status: string;
  created_at: number;
  seo_info?: SeoInfo | null;
}

/* ───────── Component ───────── */

export function LoadTestDetailContent({ test: initialTest, isLocked = false }: { test: LoadTestData; isLocked?: boolean }) {
  const formRef = useRef<HTMLDivElement>(null);

  /* ─── Test verisi (running ise poll ile güncellenir) ─── */
  const [test, setTest] = useState(initialTest);
  const isRunning = test.status === "running";

  /* Running status'taki testler için poll — tamamlanınca veriyi güncelle */
  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 60; // 2dk (2s * 60)
    const poll = async () => {
      while (!cancelled && attempt < maxAttempts) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) break;
        try {
          const data = await api.get<Record<string, unknown>>(`/load-test/${test.id}`);
          if (data.status && data.status !== "running") {
            setTest({
              ...test,
              status: data.status as string,
              total_sent: (data.total_sent as number) ?? 0,
              total_ok: (data.total_ok as number) ?? 0,
              total_errors: (data.total_errors as number) ?? 0,
              duration_sec: (data.duration_sec as number) ?? 0,
              rps: (data.rps as number) ?? 0,
              p50: (data.p50 as number) ?? null,
              p95: (data.p95 as number) ?? null,
              p99: (data.p99 as number) ?? null,
              error_reasons: data.error_reasons ? (typeof data.error_reasons === "string" ? JSON.parse(data.error_reasons as string) : data.error_reasons) as Record<string, number> | null : null,
              ramp_steps: data.ramp_steps ? (typeof data.ramp_steps === "string" ? JSON.parse(data.ramp_steps as string) : data.ramp_steps) as LoadTestData["ramp_steps"] : [],
              stopped_reason: (data.stopped_reason as string) ?? null,
              ai_analysis: (data.ai_analysis as string) ?? null,
              seo_info: data.seo_info ? data.seo_info as SeoInfo : null,
            });
            break;
          }
        } catch {
          // Sessizce devam et
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isRunning, test.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* AI analizi henüz yoksa poll ile kontrol et */
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(test.ai_analysis);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(!test.ai_analysis && !isRunning);

  // test güncellendiğinde AI state'ini senkronize et
  useEffect(() => {
    if (test.ai_analysis) {
      setAiAnalysis(test.ai_analysis);
      setAiAnalysisLoading(false);
    } else if (!isRunning && !test.ai_analysis) {
      setAiAnalysisLoading(true);
    }
  }, [test.ai_analysis, isRunning]);

  /* Inline form state */
  const [showForm, setShowForm] = useState(false);

  /* Test execution hook — detay sayfasında da tam test çalıştırabilmek için */
  const lt = useLoadTest({
    initialUrl: test.target_url || test.url,
    initialConcurrent: 500,
  });

  const pollAnalysis = useCallback(async () => {
    try {
      const data = await api.get<Record<string, unknown>>(`/load-test/${test.id}`);
      if (data.ai_analysis) {
        setAiAnalysis(data.ai_analysis as string);
        setAiAnalysisLoading(false);
        return true;
      }
    } catch {
      // Sessizce devam et
    }
    return false;
  }, [test.id]);

  useEffect(() => {
    if (test.ai_analysis || isRunning) {
      if (test.ai_analysis) setAiAnalysisLoading(false);
      return;
    }
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 15;
    const poll = async () => {
      while (!cancelled && attempt < maxAttempts) {
        attempt++;
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) break;
        const done = await pollAnalysis();
        if (done) break;
      }
      if (!cancelled) setAiAnalysisLoading(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [test.ai_analysis, isRunning, pollAnalysis]);

  /* Form açıldığında scroll */
  useEffect(() => {
    if (showForm) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [showForm]);

  /* Nudge butonuna tıklanınca formu aç ve concurrent'ı ayarla */
  const openFormWithConcurrent = (concurrent: number) => {
    lt.setConcurrentUsers(concurrent);
    setShowForm(true);
  };

  // DB verisini LoadTestReportData formatına dönüştür
  const reportData: LoadTestReportData = {
    totalSent: test.total_sent,
    totalOk: test.total_ok,
    totalErrors: test.total_errors,
    durationSec: test.duration_sec,
    rps: test.rps,
    errorReasons: test.error_reasons ?? undefined,
    rampSteps: test.ramp_steps.map((s): RampStepResult => ({
      concurrentUsers: s.concurrentUsers,
      actualConcurrency: s.actualConcurrency,
      sent: s.sent,
      ok: s.ok,
      errors: s.errors,
      errorRate: s.errorRate,
      rps: s.rps,
      p50: s.p50,
      p95: s.p95,
      p99: s.p99,
      durationSec: s.durationSec,
      errorReasons: s.errorReasons,
    })),
    targetConcurrentUsers: test.target_concurrent_users,
    stoppedReason: test.stopped_reason ?? undefined,
    p50: test.p50,
    p95: test.p95,
    p99: test.p99,
  };

  const urlDisplay = test.target_url || test.url;

  /* Düşük eşzamanlılık + başarılı sonuç → daha yüksek test önerisi */
  const errorRate = test.total_sent > 0 ? test.total_errors / test.total_sent : 0;
  const showNudge =
    test.target_concurrent_users <= 200 &&
    errorRate < 0.1 &&
    !test.stopped_reason;

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* ── Geri dön linki ── */}
        <div className="mb-6">
          <Link
            href="/load-test"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Yük Testi
          </Link>
        </div>

        {/* ── Sayfa başlığı ── */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Yük Testi Sonucu
          </h1>
          <p className="text-gray-400 break-all">{urlDisplay}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(test.created_at).toLocaleString("tr-TR")}
          </p>
        </div>

        {/* ── Running durumunda bekleme ekranı ── */}
        {isRunning && (
          <div className="mb-8 flex flex-col items-center justify-center gap-4 px-6 py-12 rounded-2xl bg-white/5 border border-white/10">
            <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-1">Test devam ediyor...</h3>
              <p className="text-sm text-gray-400">
                Test henüz tamamlanmadı. Sonuçlar hazır olduğunda otomatik olarak gösterilecek.
              </p>
            </div>
          </div>
        )}

        {/* ── Abandoned durumunda bilgi mesajı ── */}
        {test.status === "abandoned" && (
          <div className="mb-8 flex flex-col items-center justify-center gap-4 px-6 py-10 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <span className="text-3xl">⚠️</span>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-amber-300 mb-1">Test tamamlanamadı</h3>
              <p className="text-sm text-gray-400 max-w-md">
                Bu test, sayfa kapatıldığı veya bağlantı kesildiği için tamamlanamadı.
                Aşağıdan yeni bir test başlatabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* ── Düşük eşzamanlılık başarı bildirimi ── */}
        {!isRunning && test.status !== "abandoned" && showNudge && (
          <div className="mb-6 relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.08),transparent_70%)]" />
            <div className="relative space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🎯</span>
                <div>
                  <h4 className="text-base font-semibold text-purple-300">
                    Sonuçlar iyi, ama yeterli mi?
                  </h4>
                  <p className="text-sm text-purple-200/80 mt-1 leading-relaxed">
                    Siteniz {test.target_concurrent_users} eşzamanlı kullanıcıyı karşıladı.
                    Ancak gerçek trafiğiniz bunun çok üstünde olabilir. <strong className="text-purple-200">Pro plan</strong> ile
                    10.000 eşzamanlı kullanıcıya kadar test edin, detaylı performans grafiği,
                    AI analizi ve adım adım rapor ile sitenizin gerçek limitlerini keşfedin.
                  </p>
                </div>
              </div>
              <div className="ml-9">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
                      await PolarEmbedCheckout.create("https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o", { theme: "dark" });
                    } catch {
                      window.open("https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o", "_blank");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-colors cursor-pointer shadow-lg shadow-purple-500/25"
                >
                  Pro Planına Geç — $5/ay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rapor ── */}
        {!isRunning && test.status !== "abandoned" && (
          <LoadTestReport
            report={reportData}
            aiAnalysis={aiAnalysis}
            aiAnalysisLoading={aiAnalysisLoading}
            isLocked={isLocked}
            seoInfo={test.seo_info}
          />
        )}

        {/* ── Inline test formu veya "Yeni Test Başlat" butonu ── */}
        {!isRunning && <div ref={formRef} className="mt-8">

          {showForm ? (
            <div className="max-w-md mx-auto">
              {/* Kaydetme aşaması */}
              {lt.savingPhase && (
                <div className="mb-4 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
                  <svg className="animate-spin h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm text-gray-300">
                    Test tamamlandı! Sonuçlar kaydediliyor...
                  </span>
                </div>
              )}

              <LoadTestFormCard
                url={lt.url}
                setUrl={lt.setUrl}
                runTest={lt.runTest}
                loading={lt.loading}
                rampProgress={lt.rampProgress}
                error={lt.error}
                redirectInfo={lt.redirectInfo}
                stopTest={lt.stopTest}
                isAuth={!!lt.isAuth}
                userTier={lt.userTier}
                guestTestDone={lt.guestTestDone}
                concurrentUsers={lt.concurrentUsers}
                setConcurrentUsers={lt.setConcurrentUsers}
                domainWarning={lt.domainWarning}
                serverlessWarning={lt.serverlessWarning}
                seoInfo={lt.seoInfo}
                freeTestsUsed={lt.freeTestsUsed}
                callbackUrl={`/load-test/${test.id}`}
              />
              {!lt.loading && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    Kapat
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  lt.setConcurrentUsers(100);
                  setShowForm(true);
                }}
                className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm hover:bg-white/20 transition-colors cursor-pointer"
              >
                Yeni Test Başlat
              </button>
            </div>
          )}
        </div>}
      </div>
    </section>
  );
}
