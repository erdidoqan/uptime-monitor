"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { BrowserTestReport } from "@/components/browser-test/browser-test-report";
import { BrowserTestFormCard } from "@/components/browser-test/browser-test-form-card";
import type { BrowserTestReportData, BrowserTestStepResult } from "@/components/browser-test/browser-test-helpers";
import { useBrowserTest } from "@/hooks/use-browser-test";
import { api } from "@/lib/api-client";
import { formatMs, formatCls } from "@/components/browser-test/browser-test-helpers";

/* ───────── Types ───────── */

export interface BrowserTestData {
  id: string;
  url: string;
  target_url: string;
  target_browsers: number;
  tabs_per_browser: number;
  total_visits: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  avg_ttfb: number | null;
  avg_fcp: number | null;
  avg_lcp: number | null;
  avg_cls: number | null;
  p95_ttfb: number | null;
  p95_fcp: number | null;
  p95_lcp: number | null;
  avg_dom_complete: number | null;
  avg_page_load: number | null;
  total_resources: number | null;
  total_bytes: number | null;
  js_errors: number;
  error_reasons: Record<string, number> | null;
  ramp_steps: BrowserTestStepResult[];
  stopped_reason: string | null;
  ai_analysis: string | null;
  status: string;
  created_at: number;
}

/* ───────── Component ───────── */

export function BrowserTestDetailContent({
  test: initialTest,
  isLocked = false,
}: {
  test: BrowserTestData;
  isLocked?: boolean;
}) {
  const formRef = useRef<HTMLDivElement>(null);
  const [test, setTest] = useState(initialTest);
  const isRunning = test.status === "running";

  /* Running testler için poll */
  useEffect(() => {
    if (!isRunning) return;
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 120;
    const poll = async () => {
      while (!cancelled && attempt < maxAttempts) {
        attempt++;
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) break;
        try {
          const data = await api.get<Record<string, unknown>>(`/browser-test/${test.id}`);
          if (data.status && data.status !== "running") {
            setTest({
              ...test,
              status: data.status as string,
              total_visits: (data.total_visits as number) ?? 0,
              total_ok: (data.total_ok as number) ?? 0,
              total_errors: (data.total_errors as number) ?? 0,
              duration_sec: (data.duration_sec as number) ?? 0,
              avg_ttfb: (data.avg_ttfb as number) ?? null,
              avg_fcp: (data.avg_fcp as number) ?? null,
              avg_lcp: (data.avg_lcp as number) ?? null,
              avg_cls: (data.avg_cls as number) ?? null,
              p95_ttfb: (data.p95_ttfb as number) ?? null,
              p95_fcp: (data.p95_fcp as number) ?? null,
              p95_lcp: (data.p95_lcp as number) ?? null,
              avg_dom_complete: (data.avg_dom_complete as number) ?? null,
              avg_page_load: (data.avg_page_load as number) ?? null,
              total_resources: (data.total_resources as number) ?? null,
              total_bytes: (data.total_bytes as number) ?? null,
              js_errors: (data.js_errors as number) ?? 0,
              error_reasons: (data.error_reasons as Record<string, number>) ?? null,
              ramp_steps: (data.ramp_steps as BrowserTestStepResult[]) ?? [],
              stopped_reason: (data.stopped_reason as string) ?? null,
              ai_analysis: (data.ai_analysis as string) ?? null,
            });
            break;
          }
        } catch {}
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isRunning, test.id]);

  /* AI analysis polling */
  const [aiText, setAiText] = useState(test.ai_analysis);
  const [aiLoading, setAiLoading] = useState(!test.ai_analysis && test.status !== "running");

  useEffect(() => {
    if (test.ai_analysis) {
      setAiText(test.ai_analysis);
      setAiLoading(false);
      return;
    }
    if (test.status === "running" || test.status === "abandoned" || test.total_visits === 0) {
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 20;
    setAiLoading(true);
    const poll = async () => {
      while (!cancelled && attempt < maxAttempts) {
        attempt++;
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) break;
        try {
          const data = await api.get<Record<string, unknown>>(`/browser-test/${test.id}`);
          if (data.ai_analysis) {
            setAiText(data.ai_analysis as string);
            setAiLoading(false);
            break;
          }
        } catch {}
      }
      if (!cancelled) setAiLoading(false);
    };
    poll();
    return () => { cancelled = true; };
  }, [test.ai_analysis, test.status, test.id, test.total_visits]);

  /* Report data oluştur */
  const reportData: BrowserTestReportData | null =
    test.total_visits > 0
      ? {
          totalVisits: test.total_visits,
          totalOk: test.total_ok,
          totalErrors: test.total_errors,
          durationSec: test.duration_sec,
          targetBrowsers: test.target_browsers,
          tabsPerBrowser: test.tabs_per_browser,
          avgTtfb: test.avg_ttfb,
          avgFcp: test.avg_fcp,
          avgLcp: test.avg_lcp,
          avgCls: test.avg_cls,
          p95Ttfb: test.p95_ttfb,
          p95Fcp: test.p95_fcp,
          p95Lcp: test.p95_lcp,
          avgDomComplete: test.avg_dom_complete,
          avgPageLoad: test.avg_page_load,
          totalResources: test.total_resources,
          totalBytes: test.total_bytes,
          jsErrors: test.js_errors,
          errorReasons: test.error_reasons,
          rampSteps: test.ramp_steps,
          stoppedReason: test.stopped_reason ?? undefined,
        }
      : null;

  /* New test from this page */
  const bt = useBrowserTest({ initialUrl: test.target_url || test.url });

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4">
            <Link
              href="/browser-test"
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              ← Yeni gönderim
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              Trafik Raporu
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-gray-400">
            <span className="truncate text-white/80">{test.target_url || test.url}</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span>{test.target_browsers} kullanıcı × {test.tabs_per_browser} sayfa</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span>{new Date(test.created_at).toLocaleString("tr-TR")}</span>
          </div>

          {isRunning && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-300">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Ziyaretçiler sitenizde...
            </div>
          )}

          {test.status === "abandoned" && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
              İşlem yarıda kaldı
            </div>
          )}

          {/* Quick vitals */}
          {test.avg_lcp != null && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="text-gray-400">LCP: <span className="text-white font-medium">{formatMs(test.avg_lcp)}</span></span>
              {test.avg_fcp != null && (
                <span className="text-gray-400">FCP: <span className="text-white font-medium">{formatMs(test.avg_fcp)}</span></span>
              )}
              {test.avg_cls != null && (
                <span className="text-gray-400">CLS: <span className="text-white font-medium">{formatCls(test.avg_cls)}</span></span>
              )}
              {test.avg_ttfb != null && (
                <span className="text-gray-400">TTFB: <span className="text-white font-medium">{formatMs(test.avg_ttfb)}</span></span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Report ── */}
      {reportData && (
        <section className="py-8">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <BrowserTestReport
              report={reportData}
              aiAnalysis={aiText}
              aiAnalysisLoading={aiLoading}
              isLocked={isLocked}
            />
          </div>
        </section>
      )}

      {/* ── Yeni test formu ── */}
      <section ref={formRef} className="py-12 border-t border-white/10">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <h2 className="text-lg font-semibold text-white mb-6 text-center">
            Yeni Ziyaretçi Gönder
          </h2>
          <BrowserTestFormCard
            url={bt.url}
            setUrl={bt.setUrl}
            targetVisits={bt.targetVisits}
            setTargetVisits={bt.setTargetVisits}
            useProxy={bt.useProxy}
            setUseProxy={bt.setUseProxy}
            trafficSource={bt.trafficSource}
            setTrafficSource={bt.setTrafficSource}
            sessionDuration={bt.sessionDuration}
            setSessionDuration={bt.setSessionDuration}
            loading={bt.loading}
            rampProgress={bt.rampProgress}
            error={bt.error}
            domainWarning={bt.domainWarning}
            redirectInfo={bt.redirectInfo}
            savingPhase={bt.savingPhase}
            isAuth={bt.isAuth}
            userTier={bt.userTier}
            guestTestDone={bt.guestTestDone}
            guestTestCount={bt.guestTestCount}
            freeTestsUsed={bt.freeTestsUsed}
            runTest={bt.runTest}
            stopTest={bt.stopTest}
          />
        </div>
      </section>
    </div>
  );
}
