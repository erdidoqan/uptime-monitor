"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  type RampStepResult,
  percentile,
  mergeErrorReasons,
} from "@/components/load-test/load-test-helpers";
import { api, ApiError } from "@/lib/api-client";
import {
  COUNT_PER_BATCH,
  RAMP_ERROR_RATE_STOP_THRESHOLD,
  RAMP_CONSECUTIVE_FAIL_STEPS,
  GUEST_MAX_BUDGET,
  AUTH_MAX_BUDGET,
  generateRampSteps,
  distributeRequestBudget,
  calculateAutoRequests,
} from "@/lib/load-test-limits";
import type { UserTier } from "@/lib/load-test-limits";
import type { SeoInfo } from "@/lib/load-test-analyze";
import { trackLoadTestStart, trackLoadTestComplete, trackLoadTestSignInPrompt } from "@/lib/analytics";

/* ───────── Types ───────── */

interface BatchResult {
  sent: number;
  ok: number;
  errors: number;
  latencies: number[];
  summary?: { min: number; max: number; avg: number; p50: number; p95: number; p99: number };
  errorReasons?: Record<string, number>;
  cancelled?: boolean;
  serverOverloaded?: boolean;
  regions?: string[];
}

export interface RampProgress {
  step: number;
  totalSteps: number;
  concurrency: number;
  steps: number[];
  liveSent: number;
  liveOk: number;
  liveErrors: number;
  stepBatchesDone: number;
  stepBatchesTotal: number;
  completedSteps: Array<{
    concurrency: number;
    p95: number;
    errorRate: number;
  }>;
  liveWarning?: { message: string; severity: "warning" | "danger" };
}

/* ───────── Pool Pattern ───────── */

async function runPool(
  maxParallel: number,
  totalBatches: number,
  workerUrl: string,
  token: string,
  targetUrl: string,
  countPerBatch: number,
  totalRequestsForStep: number,
  signal: AbortSignal,
  onBatchDone?: (result: BatchResult, batchesDone: number) => void,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  let nextIdx = 0;
  let running = 0;

  return new Promise<BatchResult[]>((resolve) => {
    function tryStartNext() {
      while (running < maxParallel && nextIdx < totalBatches && !signal.aborted) {
        const idx = nextIdx++;
        const sentBefore = idx * countPerBatch;
        const remaining = totalRequestsForStep - sentBefore;
        const count = Math.min(countPerBatch, remaining);
        if (count <= 0) break;

        running++;
        fetch(workerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: targetUrl, count }),
          signal,
        })
          .then(async (r) => {
            if (!r.ok) {
              const t = await r.text();
              throw new Error(t || `Batch ${idx + 1} failed`);
            }
            return r.json() as Promise<BatchResult>;
          })
          .then((result) => {
            results.push(result);
            onBatchDone?.(result, results.length);
            running--;
            tryStartNext();
          })
          .catch((err) => {
            running--;
            if (!(err instanceof Error && err.name === "AbortError")) {
              const errResult: BatchResult = {
                sent: count,
                ok: 0,
                errors: count,
                latencies: [],
                errorReasons: { network_error: count },
              };
              results.push(errResult);
              onBatchDone?.(errResult, results.length);
            }
            tryStartNext();
          });
      }
      if (running === 0) resolve(results);
    }
    tryStartNext();
  });
}

/* ───────── Hook Options ───────── */

export interface UseLoadTestOptions {
  /** URL input'unun başlangıç değeri */
  initialUrl?: string;
  /** Concurrent slider'ının başlangıç değeri */
  initialConcurrent?: number;
}

/* ───────── Hook ───────── */

export function useLoadTest(opts?: UseLoadTestOptions) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRunRef = useRef<{
    token: string;
    runId: string;
    cancelUrl: string;
  } | null>(null);
  const confirmsRef = useRef<{ confirmDomain?: boolean; confirmServerless?: boolean; confirmSeo?: boolean }>({});

  /* ── State ── */
  const [url, setUrl] = useState(opts?.initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [rampProgress, setRampProgress] = useState<RampProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domainWarning, setDomainWarning] = useState<{ message: string; domain: string } | null>(null);
  const [freeTestsUsed, setFreeTestsUsed] = useState<number>(0);
  const [serverlessWarning, setServerlessWarning] = useState<{ platform: string; message: string } | null>(null);
  const [seoInfo, setSeoInfo] = useState<SeoInfo | null>(null);
  const [redirectInfo, setRedirectInfo] = useState<{
    originalUrl: string;
    finalUrl: string;
    redirectCount: number;
  } | null>(null);
  const [concurrentUsers, setConcurrentUsers] = useState<number>(opts?.initialConcurrent ?? 100);
  const [savingPhase, setSavingPhase] = useState(false);
  const [userTier, setUserTier] = useState<UserTier>("guest");
  const [guestTestDone, setGuestTestDone] = useState(false);

  const isAuth = status === "authenticated" && !!session?.user;

  /* ── Misafir localStorage kontrolü ── */
  useEffect(() => {
    if (!isAuth) {
      const done = localStorage.getItem("guest_load_test_done");
      if (done === "true") setGuestTestDone(true);
    }
  }, [isAuth]);

  /* ── Sayfa kapanırken running testi abandon olarak işaretle ── */
  useEffect(() => {
    const handleBeforeUnload = () => {
      const run = currentRunRef.current;
      if (!run?.runId) return;

      // sendBeacon ile fire-and-forget — sayfa kapansa bile tarayıcı gönderir
      const payload = JSON.stringify({ runId: run.runId });
      navigator.sendBeacon("/api/load-test/abandon", new Blob([payload], { type: "application/json" }));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  /* ── Abonelik bilgisini çek ── */
  useEffect(() => {
    if (!isAuth) {
      setUserTier("guest");
      return;
    }
    setUserTier("free");

    api.get("/subscription")
      .then((res) => {
        const data = res as {
          hasActiveSubscription?: boolean;
          subscription?: { plan?: string; status?: string } | null;
        };
        if (data.hasActiveSubscription && data.subscription) {
          setUserTier("pro");
        }
      })
      .catch(() => {});

    api.get("/load-test/history?page=1")
      .then((res) => {
        const data = res as { pagination?: { total?: number } };
        if (data.pagination?.total != null) {
          setFreeTestsUsed(data.pagination.total);
        }
      })
      .catch(() => {});
  }, [isAuth]);

  /* ── Cancel / Stop ── */
  const stopTest = useCallback(() => {
    const run = currentRunRef.current;
    if (run) {
      fetch(run.cancelUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${run.token}`,
        },
        body: JSON.stringify({ runId: run.runId }),
      }).catch(() => {});
    }
    abortControllerRef.current?.abort();
  }, []);

  /* ── Run Test (Ramp-Up) ── */
  const runTest = useCallback(async (runOpts?: { confirmDomain?: boolean; confirmServerless?: boolean; confirmSeo?: boolean }) => {
    const requestMode: "auto" | number = "auto";
    setError(null);
    setRedirectInfo(null);
    setRampProgress(null);
    setDomainWarning(null);
    setServerlessWarning(null);
    if (!runOpts?.confirmSeo) setSeoInfo(null);
    setSavingPhase(false);

    // Onayları birikimli tut
    if (runOpts?.confirmDomain) confirmsRef.current.confirmDomain = true;
    if (runOpts?.confirmServerless) confirmsRef.current.confirmServerless = true;
    if (runOpts?.confirmSeo) confirmsRef.current.confirmSeo = true;
    // Hiçbir onay yoksa sıfırla (ilk istek)
    if (!runOpts?.confirmDomain && !runOpts?.confirmServerless && !runOpts?.confirmSeo) {
      confirmsRef.current = {};
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setLoading(true);
    const startWall = Date.now();

    try {
      /* 1. Ramp adımları + istek bütçesi hesapla */
      const allMilestones = generateRampSteps(concurrentUsers);
      const totalRequests = requestMode === "auto"
        ? Math.min(calculateAutoRequests(allMilestones), isAuth ? AUTH_MAX_BUDGET : GUEST_MAX_BUDGET)
        : requestMode;
      const { steps: rampSteps, requestsPerStep: rpsArray } = distributeRequestBudget(allMilestones, totalRequests);

      /* 2. Start API call */
      const startRes = await api.post<{
        token: string;
        runId: string;
        batches: number;
        countPerBatch: number;
        maxConcurrency: number;
        workerUrl: string;
        cancelUrl: string;
        targetUrl: string;
        redirectInfo?: {
          originalUrl: string;
          finalUrl: string;
          redirectCount: number;
          status: number;
        };
        serverlessWarning?: { platform: string; message: string };
        seoInfo?: SeoInfo;
      }>("/load-test/start", {
        url: url.trim(),
        totalRequests,
        concurrentUsers,
        ...(confirmsRef.current.confirmDomain ? { confirmDomain: true } : {}),
        ...(confirmsRef.current.confirmServerless ? { confirmServerless: true } : {}),
        ...(confirmsRef.current.confirmSeo ? { confirmSeo: true } : {}),
      });

      const {
        token,
        runId,
        workerUrl,
        cancelUrl,
        targetUrl,
        redirectInfo: ri,
        serverlessWarning: sw,
        seoInfo: seoData,
      } = startRes;
      currentRunRef.current = { token, runId, cancelUrl };

      trackLoadTestStart({
        url: targetUrl,
        concurrentUsers,
        userTier,
        isGuest: !isAuth,
      });

      if (seoData) setSeoInfo(seoData);
      if (ri)
        setRedirectInfo({
          originalUrl: ri.originalUrl,
          finalUrl: ri.finalUrl,
          redirectCount: ri.redirectCount,
        });
      if (sw) setServerlessWarning(sw);

      const allRampResults: RampStepResult[] = [];
      let consecutiveHighErrorSteps = 0;
      let stoppedReason: "user" | "smart_stop" | undefined;
      let cumulativeSent = 0;
      let cumulativeOk = 0;
      let cumulativeErrors = 0;

      /* 3. Her ramp adımını çalıştır */
      for (let stepIdx = 0; stepIdx < rampSteps.length; stepIdx++) {
        if (signal.aborted) {
          stoppedReason = "user";
          break;
        }

        const stepConcurrency = rampSteps[stepIdx];
        const stepRequests = rpsArray[stepIdx];

        if (stepRequests <= 0) continue;

        const desiredParallel = Math.max(2, Math.ceil(stepConcurrency / COUNT_PER_BATCH));
        const dynamicCount = Math.min(
          Math.ceil(stepConcurrency / desiredParallel),
          COUNT_PER_BATCH,
        );
        const batchesForStep = Math.ceil(stepRequests / dynamicCount);
        const parallelWorkers = Math.min(desiredParallel, batchesForStep);
        const actualConcurrency = parallelWorkers * dynamicCount;

        let stepLiveSent = 0;
        let stepLiveOk = 0;
        let stepLiveErrors = 0;
        let stepBatchesDone = 0;
        const stepLatencies: number[] = [];
        let liveWarning: { message: string; severity: "warning" | "danger" } | undefined;

        function computeLiveWarning(): typeof liveWarning {
          const totalForStep = stepLiveSent;
          if (totalForStep < 4) return undefined;

          const errorRate = totalForStep > 0 ? stepLiveErrors / totalForStep : 0;
          const sorted = [...stepLatencies].sort((a, b) => a - b);
          const p50 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0;
          const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

          if (errorRate >= 0.5) return { message: "Sunucu isteklerin yarısından fazlasına hata veriyor — ciddi sorun var!", severity: "danger" };
          if (errorRate >= 0.1) return { message: "Hata oranı yükseliyor — sunucu zorlanmaya başladı", severity: "danger" };
          if (p95 >= 5000) return { message: `Site çok yavaş — sayfa açılması ${(p95 / 1000).toFixed(1)} saniyeye çıktı`, severity: "danger" };
          if (p95 >= 2000) return { message: `Site yavaşlamaya başladı — sayfa açılması ${(p95 / 1000).toFixed(1)} saniyeye çıktı`, severity: "warning" };
          if (p50 >= 1000) return { message: `Yanıt süreleri artıyor — ortalama ${(p50 / 1000).toFixed(1)} saniye bekleme`, severity: "warning" };
          return undefined;
        }

        const updateProgress = () => {
          setRampProgress({
            step: stepIdx + 1,
            totalSteps: rampSteps.length,
            concurrency: stepConcurrency,
            steps: rampSteps,
            liveSent: cumulativeSent + stepLiveSent,
            liveOk: cumulativeOk + stepLiveOk,
            liveErrors: cumulativeErrors + stepLiveErrors,
            stepBatchesDone,
            stepBatchesTotal: batchesForStep,
            completedSteps: allRampResults.map((r) => ({
              concurrency: r.concurrentUsers,
              p95: r.p95,
              errorRate: r.errorRate,
            })),
            liveWarning,
          });
        };

        updateProgress();

        const stepStart = Date.now();
        const stepResults = await runPool(
          parallelWorkers,
          batchesForStep,
          workerUrl,
          token,
          targetUrl,
          dynamicCount,
          stepRequests,
          signal,
          (batchResult) => {
            stepLiveSent += batchResult.sent;
            stepLiveOk += batchResult.ok;
            stepLiveErrors += batchResult.errors;
            stepBatchesDone++;
            if (batchResult.latencies) stepLatencies.push(...batchResult.latencies);
            liveWarning = computeLiveWarning();
            updateProgress();
          },
        );

        cumulativeSent += stepLiveSent;
        cumulativeOk += stepLiveOk;
        cumulativeErrors += stepLiveErrors;

        if (signal.aborted && stepResults.length === 0) {
          stoppedReason = "user";
          break;
        }

        const stepDuration = (Date.now() - stepStart) / 1000;
        const stepSent = stepResults.reduce((a, b) => a + b.sent, 0);
        const stepOk = stepResults.reduce((a, b) => a + b.ok, 0);
        const stepErrors = stepResults.reduce((a, b) => a + b.errors, 0);
        const sorted = [...stepLatencies].sort((a, b) => a - b);
        const errorRate = stepSent > 0 ? stepErrors / stepSent : (stepErrors > 0 ? 1 : 0);

        allRampResults.push({
          concurrentUsers: stepConcurrency,
          actualConcurrency,
          sent: stepSent,
          ok: stepOk,
          errors: stepErrors,
          errorRate,
          rps: stepDuration > 0 ? Math.round(stepSent / stepDuration) : 0,
          p50: Math.round(percentile(sorted, 50)),
          p95: Math.round(percentile(sorted, 95)),
          p99: Math.round(percentile(sorted, 99)),
          durationSec: stepDuration,
          latencies: sorted,
          errorReasons: mergeErrorReasons(stepResults.map((r) => r.errorReasons)),
        });

        if (errorRate >= RAMP_ERROR_RATE_STOP_THRESHOLD) {
          consecutiveHighErrorSteps++;
        } else {
          consecutiveHighErrorSteps = 0;
        }
        if (consecutiveHighErrorSteps >= RAMP_CONSECUTIVE_FAIL_STEPS) {
          stoppedReason = "smart_stop";
          break;
        }
      }

      /* 4. Rapor metriklerini hesapla */
      const durationSec = (Date.now() - startWall) / 1000;
      const totalSent = allRampResults.reduce((a, b) => a + b.sent, 0);
      const totalOk = allRampResults.reduce((a, b) => a + b.ok, 0);
      const totalErrors = allRampResults.reduce((a, b) => a + b.errors, 0);
      const allLatencies = allRampResults.flatMap((r) => r.latencies ?? []);
      const sortedAll = [...allLatencies].sort((a, b) => a - b);
      const rps = durationSec > 0 ? Math.round(totalSent / durationSec) : 0;
      const errorReasons = mergeErrorReasons(allRampResults.map((r) => r.errorReasons));

      trackLoadTestComplete({
        url: url.trim(),
        concurrentUsers,
        totalSent,
        totalErrors,
        durationSec,
        userTier,
        isGuest: !isAuth,
        runId,
      });

      if (!isAuth) {
        try { localStorage.setItem("guest_load_test_done", "true"); } catch {}
        setGuestTestDone(true);
        trackLoadTestSignInPrompt();
      }

      if (isAuth && userTier === "free") {
        setFreeTestsUsed((prev) => prev + 1);
      }

      /* 5. D1 güncelle */
      setSavingPhase(true);
      const savePayload = {
        runId,
        totalRequests,
        totalSent,
        totalOk,
        totalErrors,
        durationSec,
        rps,
        p50: sortedAll.length > 0 ? Math.round(percentile(sortedAll, 50)) : null,
        p95: sortedAll.length > 0 ? Math.round(percentile(sortedAll, 95)) : null,
        p99: sortedAll.length > 0 ? Math.round(percentile(sortedAll, 99)) : null,
        errorReasons,
        rampSteps: allRampResults.map((s) => ({
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
        stoppedReason,
        requestMode: requestMode === "auto" ? "auto" : "manual",
      };
      await api.post("/load-test/save", savePayload);

      /* 6. AI analizi fire-and-forget */
      api.post("/load-test/analyze", {
        runId,
        url,
        targetConcurrentUsers: concurrentUsers,
        totalSent,
        totalOk,
        totalErrors,
        durationSec,
        rps,
        rampSteps: allRampResults.map((s) => ({
          concurrency: s.concurrentUsers,
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
        errorReasons,
      }).catch(() => {});

      /* 7. Detay sayfasına hemen yönlendir */
      router.push(`/load-test/${runId}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (currentRunRef.current?.runId) {
          api.post("/load-test/save", {
            runId: currentRunRef.current.runId,
            totalSent: 0, totalOk: 0, totalErrors: 0, durationSec: 0, rps: 0,
            rampSteps: [],
            stoppedReason: "user",
            requestMode: "auto",
            status: "stopped",
          }).catch(() => {});
        }
        return;
      }
      if (currentRunRef.current?.runId) {
        api.post("/load-test/save", {
          runId: currentRunRef.current.runId,
          totalSent: 0, totalOk: 0, totalErrors: 0, durationSec: 0, rps: 0,
          rampSteps: [],
          requestMode: "auto",
          status: "failed",
        }).catch(() => {});
      }
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Test başlatılamadı.";

      if (e instanceof ApiError && e.data) {
        if (e.data.requiresAuth) {
          setGuestTestDone(true);
          try { localStorage.setItem("guest_load_test_done", "true"); } catch {}
        }
        if (e.data.domainWarning) {
          setDomainWarning({ message: msg, domain: e.data.domain || "" });
          setLoading(false);
          return;
        }
        if (e.data.serverlessWarning) {
          setServerlessWarning({ platform: e.data.platform || "Serverless", message: msg });
          // Serverless uyarısıyla birlikte seoInfo de gelebilir
          if (e.data.seoInfo) setSeoInfo(e.data.seoInfo as SeoInfo);
          setLoading(false);
          return;
        }
        if (e.data.seoWarning && e.data.seoInfo) {
          setSeoInfo(e.data.seoInfo as SeoInfo);
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

      const retryAfter =
        e instanceof ApiError && e.data?.retryAfter != null
          ? e.data.retryAfter
          : null;
      setError(
        retryAfter
          ? `${msg} ${retryAfter} saniye sonra tekrar deneyin.`
          : msg,
      );
    } finally {
      currentRunRef.current = null;
      setLoading(false);
      setRampProgress(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, concurrentUsers, isAuth, userTier, router]);

  return {
    /* Form state */
    url,
    setUrl,
    concurrentUsers,
    setConcurrentUsers,
    /* Test state */
    loading,
    rampProgress,
    error,
    domainWarning,
    serverlessWarning,
    seoInfo,
    redirectInfo,
    savingPhase,
    /* Auth state */
    isAuth,
    userTier,
    guestTestDone,
    freeTestsUsed,
    /* Actions */
    runTest,
    stopTest,
  };
}
