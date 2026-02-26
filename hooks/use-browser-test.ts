"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  type BrowserTestStepResult,
  percentile,
  mergeErrorReasons,
} from "@/components/browser-test/browser-test-helpers";
import { api, ApiError } from "@/lib/api-client";
import {
  getMaxBrowsersForTier,
  getMaxTabsForTier,
} from "@/lib/browser-test-limits";
import type { UserTier } from "@/lib/browser-test-limits";
import type { SeoInfo } from "@/lib/load-test-analyze";

/* ───────── Types ───────── */

export type TrafficSource = "direct" | "organic" | "social";
export type SessionDuration = "fast" | "realistic" | "long";

export interface BrowserRampProgress {
  currentBrowser: number;
  totalBrowsers: number;
  liveVisits: number;
  liveOk: number;
  liveErrors: number;
}

interface StreamTabLine {
  type: "tab";
  ok: boolean;
  vitals: {
    ttfb: number; fcp: number; lcp: number; cls: number;
    domInteractive: number; domComplete: number; pageLoad: number;
    totalResources: number; totalBytes: number; jsErrors: number;
  } | null;
  error: string | null;
  durationMs: number;
}

interface StreamBrowserLine {
  type: "browser";
  idx: number;
  total: number;
}

interface StreamDoneLine {
  type: "done";
  totalVisits: number;
  ok: number;
  errors: number;
  browsersUsed: number;
  tabsPerBrowser: number;
  jsErrors: number;
  errorReasons: Record<string, number>;
  summary: {
    avgTtfb: number; avgFcp: number; avgLcp: number; avgCls: number;
    avgDomComplete: number; avgPageLoad: number;
    p95Ttfb: number; p95Fcp: number; p95Lcp: number;
    totalResources: number; totalBytes: number;
  } | null;
  vitals: {
    ttfb: number[]; fcp: number[]; lcp: number[]; cls: number[];
    domInteractive: number[]; domComplete: number[]; pageLoad: number[];
    totalResources: number[]; totalBytes: number[];
  };
}

interface StreamErrorLine {
  type: "error";
  message: string;
}

type StreamLine = StreamTabLine | StreamBrowserLine | StreamDoneLine | StreamErrorLine;

/* ───────── Hook ───────── */

export interface UseBrowserTestOptions {
  initialUrl?: string;
  initialBrowsers?: number;
}

export function useBrowserTest(opts?: UseBrowserTestOptions) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRunRef = useRef<{ token: string; runId: string } | null>(null);
  const confirmsRef = useRef<{ confirmDomain?: boolean }>({});

  const [url, setUrl] = useState(opts?.initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [rampProgress, setRampProgress] = useState<BrowserRampProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domainWarning, setDomainWarning] = useState<{ message: string; domain: string } | null>(null);
  const [freeTestsUsed, setFreeTestsUsed] = useState<number>(0);
  const [redirectInfo, setRedirectInfo] = useState<{
    originalUrl: string;
    finalUrl: string;
    redirectCount: number;
  } | null>(null);
  const [targetBrowsers, setTargetBrowsers] = useState<number>(opts?.initialBrowsers ?? 5);
  const [useProxy, setUseProxy] = useState(false);
  const [trafficSource, setTrafficSource] = useState<TrafficSource>("organic");
  const [sessionDuration, setSessionDuration] = useState<SessionDuration>("fast");
  const [savingPhase, setSavingPhase] = useState(false);
  const [userTier, setUserTier] = useState<UserTier>("guest");
  const [guestTestDone, setGuestTestDone] = useState(false);

  const isAuth = status === "authenticated" && !!session?.user;

  useEffect(() => {
    if (!isAuth) {
      const done = localStorage.getItem("guest_browser_test_done");
      if (done === "true") setGuestTestDone(true);
    }
  }, [isAuth]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const run = currentRunRef.current;
      if (!run?.runId) return;
      const payload = JSON.stringify({ runId: run.runId });
      navigator.sendBeacon("/api/browser-test/abandon", new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isAuth) {
      setUserTier("guest");
      return;
    }
    setUserTier("free");

    api.get("/subscription")
      .then((res) => {
        const data = res as { hasActiveSubscription?: boolean; subscription?: { plan?: string; status?: string } | null };
        if (data.hasActiveSubscription && data.subscription) {
          setUserTier("pro");
        }
      })
      .catch(() => {});

    api.get("/browser-test/history?page=1")
      .then((res) => {
        const data = res as { pagination?: { total?: number } };
        if (data.pagination?.total != null) {
          setFreeTestsUsed(data.pagination.total);
        }
      })
      .catch(() => {});
  }, [isAuth]);

  const stopTest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const runTest = useCallback(async (runOpts?: { confirmDomain?: boolean }) => {
    setError(null);
    setRedirectInfo(null);
    setRampProgress(null);
    setDomainWarning(null);
    setSavingPhase(false);

    if (runOpts?.confirmDomain) confirmsRef.current.confirmDomain = true;
    if (!runOpts?.confirmDomain) confirmsRef.current = {};

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setLoading(true);
    const startWall = Date.now();

    try {
      const maxTabs = getMaxTabsForTier(userTier);

      const startRes = await api.post<{
        token: string;
        runId: string;
        workerUrl: string;
        targetUrl: string;
        targetBrowsers: number;
        tabsPerBrowser: number;
        redirectInfo?: { originalUrl: string; finalUrl: string; redirectCount: number };
      }>("/browser-test/start", {
        url: url.trim(),
        targetBrowsers,
        tabsPerBrowser: maxTabs,
        useProxy,
        trafficSource,
        sessionDuration,
        ...(confirmsRef.current.confirmDomain ? { confirmDomain: true } : {}),
      });

      const { token, runId, workerUrl, targetUrl, tabsPerBrowser } = startRes;
      currentRunRef.current = { token, runId };

      if (startRes.redirectInfo) setRedirectInfo(startRes.redirectInfo);

      setRampProgress({
        currentBrowser: 0,
        totalBrowsers: targetBrowsers,
        liveVisits: 0,
        liveOk: 0,
        liveErrors: 0,
      });

      /* ── Stream from worker ── */
      const res = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: targetUrl,
          browsers: targetBrowsers,
          tabsPerBrowser,
          useProxy,
          trafficSource,
          sessionDuration,
        }),
        signal,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Worker request failed");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let doneLine: StreamDoneLine | null = null;

      let cumulativeVisits = 0;
      let cumulativeOk = 0;
      let cumulativeErrors = 0;
      let currentBrowser = 0;

      const allVitals = {
        ttfb: [] as number[], fcp: [] as number[], lcp: [] as number[], cls: [] as number[],
        domInteractive: [] as number[], domComplete: [] as number[], pageLoad: [] as number[],
        totalResources: [] as number[], totalBytes: [] as number[],
      };
      let totalJsErrors = 0;
      const errorReasons: Record<string, number> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed) continue;

          let line: StreamLine;
          try {
            line = JSON.parse(trimmed) as StreamLine;
          } catch {
            continue;
          }

          if (line.type === "browser") {
            currentBrowser = line.idx;
            setRampProgress((prev) => prev ? { ...prev, currentBrowser: line.idx } : prev);
          } else if (line.type === "tab") {
            cumulativeVisits++;
            if (line.ok) {
              cumulativeOk++;
              if (line.vitals) {
                allVitals.ttfb.push(line.vitals.ttfb);
                allVitals.fcp.push(line.vitals.fcp);
                allVitals.lcp.push(line.vitals.lcp);
                allVitals.cls.push(line.vitals.cls);
                allVitals.domInteractive.push(line.vitals.domInteractive);
                allVitals.domComplete.push(line.vitals.domComplete);
                allVitals.pageLoad.push(line.vitals.pageLoad);
                allVitals.totalResources.push(line.vitals.totalResources);
                allVitals.totalBytes.push(line.vitals.totalBytes);
                totalJsErrors += line.vitals.jsErrors;
              }
            } else {
              cumulativeErrors++;
              const reason = line.error ?? "unknown_error";
              errorReasons[reason] = (errorReasons[reason] ?? 0) + 1;
            }

            setRampProgress({
              currentBrowser,
              totalBrowsers: targetBrowsers,
              liveVisits: cumulativeVisits,
              liveOk: cumulativeOk,
              liveErrors: cumulativeErrors,
            });
          } else if (line.type === "done") {
            doneLine = line;
          } else if (line.type === "error") {
            throw new Error(line.message);
          }
        }
      }

      /* ── Compute report metrics ── */
      const durationSec = (Date.now() - startWall) / 1000;
      const totalVisits = doneLine?.totalVisits ?? cumulativeVisits;
      const totalOk = doneLine?.ok ?? cumulativeOk;
      const totalErrors = doneLine?.errors ?? cumulativeErrors;

      const sortedTtfb = [...allVitals.ttfb].sort((a, b) => a - b);
      const sortedFcp = [...allVitals.fcp].sort((a, b) => a - b);
      const sortedLcp = [...allVitals.lcp].sort((a, b) => a - b);

      const avgTtfb = allVitals.ttfb.length > 0 ? avg(allVitals.ttfb) : null;
      const avgFcp = allVitals.fcp.length > 0 ? avg(allVitals.fcp) : null;
      const avgLcp = allVitals.lcp.length > 0 ? avg(allVitals.lcp) : null;
      const avgCls = allVitals.cls.length > 0 ? avg(allVitals.cls) : null;
      const p95Ttfb = sortedTtfb.length > 0 ? Math.round(percentile(sortedTtfb, 95)) : null;
      const p95Fcp = sortedFcp.length > 0 ? Math.round(percentile(sortedFcp, 95)) : null;
      const p95Lcp = sortedLcp.length > 0 ? Math.round(percentile(sortedLcp, 95)) : null;
      const avgDomComplete = allVitals.domComplete.length > 0 ? avg(allVitals.domComplete) : null;
      const avgPageLoad = allVitals.pageLoad.length > 0 ? avg(allVitals.pageLoad) : null;
      const totalResources = allVitals.totalResources.length > 0 ? avg(allVitals.totalResources) : null;
      const totalBytes = allVitals.totalBytes.length > 0 ? avg(allVitals.totalBytes) : null;

      if (!isAuth) {
        try { localStorage.setItem("guest_browser_test_done", "true"); } catch {}
        setGuestTestDone(true);
      }
      if (isAuth && userTier === "free") {
        setFreeTestsUsed((prev) => prev + 1);
      }

      /* ── Save to D1 ── */
      setSavingPhase(true);

      const rampSteps: BrowserTestStepResult[] = [{
        browsers: targetBrowsers,
        tabsPerBrowser,
        totalVisits,
        ok: totalOk,
        errors: totalErrors,
        errorRate: totalVisits > 0 ? totalErrors / totalVisits : 0,
        durationSec,
        avgTtfb: avgTtfb ?? 0,
        avgFcp: avgFcp ?? 0,
        avgLcp: avgLcp ?? 0,
        avgCls: avgCls ?? 0,
        p95Ttfb: p95Ttfb ?? 0,
        p95Fcp: p95Fcp ?? 0,
        p95Lcp: p95Lcp ?? 0,
        avgDomComplete: avgDomComplete ?? 0,
        avgPageLoad: avgPageLoad ?? 0,
        totalResources: totalResources ?? 0,
        totalBytes: totalBytes ?? 0,
        jsErrors: totalJsErrors,
        errorReasons: Object.keys(errorReasons).length > 0 ? errorReasons : undefined,
      }];

      await api.post("/browser-test/save", {
        runId,
        totalVisits,
        totalOk,
        totalErrors,
        durationSec,
        avgTtfb,
        avgFcp,
        avgLcp,
        avgCls,
        p95Ttfb,
        p95Fcp,
        p95Lcp,
        avgDomComplete,
        avgPageLoad,
        totalResources,
        totalBytes,
        jsErrors: totalJsErrors,
        errorReasons,
        rampSteps: rampSteps.map((s) => ({
          browsers: s.browsers,
          tabsPerBrowser: s.tabsPerBrowser,
          totalVisits: s.totalVisits,
          ok: s.ok,
          errors: s.errors,
          errorRate: s.errorRate,
          durationSec: s.durationSec,
          avgTtfb: s.avgTtfb,
          avgFcp: s.avgFcp,
          avgLcp: s.avgLcp,
          avgCls: s.avgCls,
          p95Ttfb: s.p95Ttfb,
          p95Fcp: s.p95Fcp,
          p95Lcp: s.p95Lcp,
          avgDomComplete: s.avgDomComplete,
          avgPageLoad: s.avgPageLoad,
          totalResources: s.totalResources,
          totalBytes: s.totalBytes,
          jsErrors: s.jsErrors,
          errorReasons: s.errorReasons,
        })),
      });

      /* ── AI analysis fire-and-forget ── */
      api.post("/browser-test/analyze", {
        runId,
        url,
        targetBrowsers,
        totalVisits,
        totalOk,
        totalErrors,
        durationSec,
        rampSteps: rampSteps.map((s) => ({
          browsers: s.browsers,
          totalVisits: s.totalVisits,
          ok: s.ok,
          errors: s.errors,
          errorRate: s.errorRate,
          avgLcp: s.avgLcp,
          avgFcp: s.avgFcp,
          avgTtfb: s.avgTtfb,
          avgCls: s.avgCls,
          avgPageLoad: s.avgPageLoad,
          jsErrors: s.jsErrors,
          errorReasons: s.errorReasons,
        })),
        errorReasons,
      }).catch(() => {});

      router.push(`/browser-test/${runId}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (currentRunRef.current?.runId) {
          api.post("/browser-test/save", {
            runId: currentRunRef.current.runId,
            totalVisits: 0, totalOk: 0, totalErrors: 0, durationSec: 0,
            jsErrors: 0, rampSteps: [], stoppedReason: "user", status: "stopped",
          }).catch(() => {});
        }
        return;
      }
      if (currentRunRef.current?.runId) {
        api.post("/browser-test/save", {
          runId: currentRunRef.current.runId,
          totalVisits: 0, totalOk: 0, totalErrors: 0, durationSec: 0,
          jsErrors: 0, rampSteps: [], status: "failed",
        }).catch(() => {});
      }
      const msg =
        e instanceof ApiError ? e.message
          : e instanceof Error ? e.message
            : "Test başlatılamadı.";

      if (e instanceof ApiError && e.data) {
        if (e.data.requiresAuth) {
          setGuestTestDone(true);
          try { localStorage.setItem("guest_browser_test_done", "true"); } catch {}
        }
        if (e.data.domainWarning) {
          setDomainWarning({ message: msg, domain: e.data.domain || "" });
          setLoading(false);
          return;
        }
        if (e.data.requiresPlan === "pro") {
          import("@polar-sh/checkout/embed")
            .then(({ PolarEmbedCheckout }) =>
              PolarEmbedCheckout.create(
                "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o",
                { theme: "dark" },
              ),
            )
            .catch(() => {
              window.open(
                "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o",
                "_blank",
              );
            });
        }
      }
      setError(msg);
    } finally {
      currentRunRef.current = null;
      setLoading(false);
      setRampProgress(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, targetBrowsers, useProxy, trafficSource, sessionDuration, isAuth, userTier, router]);

  return {
    url, setUrl,
    targetBrowsers, setTargetBrowsers,
    useProxy, setUseProxy,
    trafficSource, setTrafficSource,
    sessionDuration, setSessionDuration,
    loading, rampProgress, error,
    domainWarning, redirectInfo,
    savingPhase,
    isAuth, userTier, guestTestDone, freeTestsUsed,
    runTest, stopTest,
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
