"use client";

import { useMemo } from "react";
import { GoogleSignInButton } from "@/components/landing/google-sign-in-button";
import {
  ENTERPRISE_MAX_CONCURRENT,
  FREE_MAX_CONCURRENT,
  FREE_MAX_TESTS,
  GUEST_MAX_CONCURRENT,
  generateRampSteps,
  getAutoTotalRequests,
} from "@/lib/load-test-limits";
import type { RampProgress } from "@/hooks/use-load-test";
import type { UserTier } from "@/lib/load-test-limits";
import type { SeoInfo } from "@/lib/load-test-analyze";
import { trackInitiateCheckout, trackLoadTestSignInPrompt, trackLoadTestUpgradePrompt } from "@/lib/analytics";

/* ── Slider adım noktaları ── */
const SLIDER_STEPS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  200, 300, 400, 500, 600, 700, 800, 900, 1000,
  2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
] as const;

const POLAR_CHECKOUT_URL =
  "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o";

async function openPolarCheckout() {
  trackInitiateCheckout({ planName: 'pro', value: 5, currency: 'USD' });
  try {
    const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
    await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: "dark" });
  } catch {
    window.open(POLAR_CHECKOUT_URL, "_blank");
  }
}

/* ── Format ── */
function formatRequests(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `${k}k` : `~${k.toFixed(1)}k`;
  }
  return String(n);
}

/* ── Step Indicator ── */
function StepIndicator({ rampProgress }: { rampProgress: RampProgress }) {
  const { step, steps, completedSteps } = rampProgress;
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((concurrency, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isCompleted = stepNum < step;
        const completed = completedSteps[i];
        const hasHighError = completed && completed.errorRate >= 0.5;
        const hasMedError = completed && completed.errorRate >= 0.1;
        const hasHighLatency =
          completed && !hasHighError && !hasMedError && completed.p95 >= 5000;
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-2 h-px ${isCompleted ? "bg-white/30" : "bg-white/10"}`} />
            )}
            <div
              className={`relative flex items-center justify-center min-w-[2rem] h-7 px-1.5 rounded-md text-[10px] font-medium tabular-nums transition-all ${
                isActive
                  ? "bg-white/20 text-white ring-1 ring-white/40"
                  : isCompleted
                    ? hasHighError
                      ? "bg-red-500/20 text-red-300"
                      : hasMedError
                        ? "bg-amber-500/20 text-amber-300"
                        : hasHighLatency
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/5 text-white/30"
              }`}
            >
              {isActive && <span className="absolute inset-0 rounded-md bg-white/10 animate-pulse" />}
              <span className="relative z-10">{concurrency}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Live Progress Panel ── */
function LiveProgressPanel({
  rampProgress,
  stopTest,
  targetUrl,
  seoInfo,
}: {
  rampProgress: RampProgress;
  stopTest: () => void;
  targetUrl: string;
  seoInfo?: SeoInfo | null;
}) {
  const { step, totalSteps, concurrency, liveSent, liveOk, liveErrors, stepBatchesDone, stepBatchesTotal, liveWarning } = rampProgress;
  const stepProgressPct = stepBatchesTotal > 0 ? Math.min(100, Math.round((stepBatchesDone / stepBatchesTotal) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 font-medium">Ramp Adımları</span>
          <span className="text-xs text-gray-500">Adım {step}/{totalSteps}</span>
        </div>
        <StepIndicator rampProgress={rampProgress} />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute -inset-1 bg-white/10 rounded-lg blur-sm animate-pulse" />
          <div className="relative text-2xl font-bold text-white tabular-nums">{concurrency}</div>
        </div>
        <div className="text-sm text-gray-400 leading-tight">eşzamanlı<br />kullanıcı</div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Mevcut adım</span>
          <span className="text-xs text-gray-500 tabular-nums">{stepProgressPct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 ease-out relative"
            style={{ width: `${stepProgressPct}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/5 p-2.5 text-center">
          <div className="text-lg font-semibold text-white tabular-nums">{liveSent.toLocaleString("tr-TR")}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Gönderilen</div>
        </div>
        <div className="rounded-lg bg-emerald-500/5 p-2.5 text-center">
          <div className="text-lg font-semibold text-emerald-400 tabular-nums">{liveOk.toLocaleString("tr-TR")}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Başarılı</div>
        </div>
        <div className="rounded-lg bg-red-500/5 p-2.5 text-center">
          <div className="text-lg font-semibold text-red-400 tabular-nums">{liveErrors.toLocaleString("tr-TR")}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Hata</div>
        </div>
      </div>
      {liveWarning && (
        <div className={`flex items-start gap-2 p-2.5 rounded-lg animate-in fade-in duration-300 ${liveWarning.severity === "danger" ? "bg-red-500/10 border border-red-500/25" : "bg-amber-500/10 border border-amber-500/25"}`}>
          <svg className={`h-4 w-4 mt-0.5 shrink-0 ${liveWarning.severity === "danger" ? "text-red-400" : "text-amber-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span className={`text-xs leading-relaxed ${liveWarning.severity === "danger" ? "text-red-200/90" : "text-amber-200/90"}`}>
            {liveWarning.message}{" — "}
            <a href={targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-0.5 underline underline-offset-2 font-medium hover:brightness-125 transition-all ${liveWarning.severity === "danger" ? "text-red-300" : "text-amber-300"}`}>
              sen de bak
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </span>
        </div>
      )}
      {seoInfo && (
        <div className={`p-2.5 rounded-lg text-[11px] ${seoInfo.hasSitemap ? "bg-emerald-500/5 border border-emerald-500/15 text-emerald-300/70" : "bg-orange-500/5 border border-orange-500/15 text-orange-300/70"}`}>
          {seoInfo.hasSitemap ? (
            <span>📋 Sitemap: {seoInfo.sitemapUrlCount?.toLocaleString("tr-TR") ?? "?"} sayfa tespit edildi{seoInfo.cms ? ` (${seoInfo.cms})` : ""}</span>
          ) : (
            <span>⚠️ Sitemap bulunamadı — Google sayfalarınızı keşfedemeyebilir</span>
          )}
        </div>
      )}
      <button type="button" onClick={stopTest} className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
        Testi Durdur
      </button>
    </div>
  );
}

/* ── Slider Tier Marks ── */
function SliderTierMarks({ userTier }: { max: number; userTier: UserTier }) {
  const marks = [
    { value: GUEST_MAX_CONCURRENT, label: "Misafir", tier: "guest" as const },
    { value: FREE_MAX_CONCURRENT, label: "Free", tier: "free" as const },
    { value: 500, label: "Pro $5/ay", tier: "pro" as const },
  ];
  const tierOrder: UserTier[] = ["guest", "free", "pro", "enterprise"];
  const userTierIdx = tierOrder.indexOf(userTier);
  const totalSteps = SLIDER_STEPS.length - 1;

  return (
    <>
      {/* Desktop: absolute positioned marks */}
      <div className="relative h-4 mt-1 hidden sm:block">
        {marks.map((m) => {
          const idx = SLIDER_STEPS.indexOf(m.value as (typeof SLIDER_STEPS)[number]);
          if (idx === -1) return null;
          const pct = (idx / totalSteps) * 100;
          const markTierIdx = tierOrder.indexOf(m.tier);
          const isLocked = markTierIdx >= userTierIdx;
          return (
            <div key={m.value} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct}%` }}>
              <div className={`w-px h-2 ${isLocked ? "bg-white/20" : "bg-white/10"}`} />
              <span className={`text-[9px] mt-0.5 whitespace-nowrap ${isLocked ? "text-gray-400" : "text-gray-600"}`}>
                {m.label} ({m.value.toLocaleString("tr-TR")})
              </span>
            </div>
          );
        })}
      </div>
      {/* Mobile: inline flex marks */}
      <div className="flex sm:hidden justify-between mt-1.5 px-0.5">
        {marks.map((m) => {
          const markTierIdx = tierOrder.indexOf(m.tier);
          const isLocked = markTierIdx >= userTierIdx;
          return (
            <span key={m.value} className={`text-[9px] ${isLocked ? "text-gray-400" : "text-gray-600"}`}>
              {m.label} ({m.value.toLocaleString("tr-TR")})
            </span>
          );
        })}
      </div>
    </>
  );
}

/* ── Button State ── */
type ButtonState =
  | { type: "start" }
  | { type: "google"; message: string }
  | { type: "upgrade_pro" };

function getButtonState(isAuth: boolean, userTier: UserTier, guestTestDone: boolean, concurrentUsers: number): ButtonState {
  if (!isAuth) {
    if (guestTestDone) return { type: "google", message: "Misafir test hakkınız doldu. Devam etmek için giriş yapın." };
    if (concurrentUsers > GUEST_MAX_CONCURRENT) return { type: "google", message: `${concurrentUsers.toLocaleString("tr-TR")} eşzamanlı kullanıcı için giriş yapmanız gerekiyor.` };
    return { type: "start" };
  }
  if (concurrentUsers > FREE_MAX_CONCURRENT && userTier !== "pro" && userTier !== "enterprise") return { type: "upgrade_pro" };
  return { type: "start" };
}

/* ── Props ── */

export interface LoadTestFormCardProps {
  url: string;
  setUrl: (url: string) => void;
  runTest: (opts?: { confirmDomain?: boolean; confirmServerless?: boolean; confirmSeo?: boolean }) => void;
  loading: boolean;
  rampProgress: RampProgress | null;
  error: string | null;
  redirectInfo: { originalUrl: string; finalUrl: string; redirectCount: number } | null;
  stopTest: () => void;
  isAuth: boolean;
  userTier: UserTier;
  guestTestDone: boolean;
  concurrentUsers: number;
  setConcurrentUsers: (n: number) => void;
  domainWarning: { message: string; domain: string } | null;
  serverlessWarning: { platform: string; message: string } | null;
  seoInfo: SeoInfo | null;
  freeTestsUsed: number;
  /** Google sign-in sonrası callback URL'i (default: /load-test) */
  callbackUrl?: string;
}

/* ── Form Card Component ── */

export function LoadTestFormCard({
  url,
  setUrl,
  runTest,
  loading,
  rampProgress,
  error,
  redirectInfo,
  stopTest,
  isAuth,
  userTier,
  guestTestDone,
  concurrentUsers,
  setConcurrentUsers,
  domainWarning,
  serverlessWarning,
  seoInfo,
  freeTestsUsed,
  callbackUrl = "/load-test",
}: LoadTestFormCardProps) {
  const sliderMax = ENTERPRISE_MAX_CONCURRENT;

  const autoInfo = useMemo(() => {
    const steps = generateRampSteps(concurrentUsers);
    const totalReq = getAutoTotalRequests(concurrentUsers, isAuth);
    return { steps: steps.length, totalReq };
  }, [concurrentUsers, isAuth]);

  const buttonState = getButtonState(isAuth, userTier, guestTestDone, concurrentUsers);

  return (
    <div className="rounded-2xl bg-[#1a1a1d]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 shadow-2xl">
      {loading && rampProgress ? (
        <LiveProgressPanel rampProgress={rampProgress} stopTest={stopTest} targetUrl={url} seoInfo={seoInfo} />
      ) : loading && !rampProgress ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-t-white/60 animate-spin" />
          </div>
          <p className="text-gray-400 text-sm">URL analiz ediliyor...</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-white mb-2">Hemen test edin</h2>
          <p className="text-white/70 text-sm mb-4">URL girin, eşzamanlı kullanıcı sayısını seçin ve testi başlatın.</p>
          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
              <input
                id="load-test-url"
                type="url"
                value={url}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && !/^https?:\/\//i.test(v)) setUrl("https://" + v);
                  else setUrl(v);
                }}
                onFocus={(e) => {
                  const v = e.target.value;
                  if (!v.trim()) setUrl("https://");
                }}
                placeholder="https://example.com"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                disabled={loading}
              />
            </div>

            {/* Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Hedef eşzamanlı kullanıcı</label>
                <span className="text-white font-semibold tabular-nums">{concurrentUsers.toLocaleString("tr-TR")}</span>
              </div>
              <input
                type="range"
                min={0}
                max={SLIDER_STEPS.length - 1}
                step={1}
                value={
                  (SLIDER_STEPS as readonly number[]).indexOf(concurrentUsers) !== -1
                    ? (SLIDER_STEPS as readonly number[]).indexOf(concurrentUsers)
                    : SLIDER_STEPS.findIndex((s) => s >= concurrentUsers)
                }
                onChange={(e) => setConcurrentUsers(SLIDER_STEPS[Number(e.target.value)])}
                disabled={loading}
                className="w-full h-3 sm:h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:sm:w-4 [&::-webkit-slider-thumb]:sm:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:sm:w-4 [&::-moz-range-thumb]:sm:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              />
              <SliderTierMarks max={sliderMax} userTier={userTier} />
              <p className="text-xs text-gray-500 mt-4">
                {autoInfo.steps} adımda kademeli artış | {formatRequests(autoInfo.totalReq)} istek
              </p>
            </div>

            {/* Free kullanıcı kalan hak */}
            {isAuth && userTier === "free" && (
              <div className={`px-3 py-2 rounded-lg border text-xs ${FREE_MAX_TESTS - freeTestsUsed <= 0 ? "bg-purple-500/10 border-purple-500/30" : "bg-white/5 border-white/10"}`}>
                {FREE_MAX_TESTS - freeTestsUsed <= 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-purple-300 font-medium">
                      Sınırsız test + detaylı raporlar için Pro planına geçin
                    </span>
                    <button type="button" onClick={openPolarCheckout} className="self-start px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors">
                      Pro Planına Geç — $5/ay
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">
                      Kalan test hakkı:{" "}
                      <span className={`font-semibold ${FREE_MAX_TESTS - freeTestsUsed <= 1 ? "text-amber-400" : "text-white"}`}>
                        {Math.max(0, FREE_MAX_TESTS - freeTestsUsed)}
                      </span>{" "}
                      / {FREE_MAX_TESTS}
                    </span>
                    {FREE_MAX_TESTS - freeTestsUsed === 1 && (
                      <span className="text-amber-400/70 text-[10px]">Son hakkınız</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 100+ eşzamanlı uyarısı: Free kullanıcı */}
            {isAuth && userTier === "free" && concurrentUsers > FREE_MAX_CONCURRENT && (
              <div className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300">
                100+ eşzamanlı kullanıcı ve detaylı raporlar için Pro planına geçin — $5/ay
              </div>
            )}

            {/* Buton */}
            {buttonState.type === "google" ? (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-amber-400/80 text-center">{buttonState.message}</p>
                <GoogleSignInButton callbackUrl={callbackUrl} className="w-full py-3 px-4 rounded-xl font-semibold text-base" />
              </div>
            ) : buttonState.type === "upgrade_pro" ? (
              <button type="button" onClick={() => { trackLoadTestUpgradePrompt({ reason: 'concurrent_limit', concurrentUsers }); openPolarCheckout(); }} className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-base cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors">
                Pro Planına Geç — $5/ay
              </button>
            ) : (
              <button type="button" onClick={() => runTest()} disabled={loading || !url.trim()} className="w-full mt-2 py-3 px-4 rounded-xl bg-white text-[#0a0a0b] font-semibold text-base cursor-pointer hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                Testi başlat
              </button>
            )}

            {redirectInfo && (
              <p className="text-sm text-amber-400/90">
                {redirectInfo.redirectCount} yönlendirme tespit edildi. Test şu adrese yapılıyor:{" "}
                <span className="font-mono text-white break-all">{redirectInfo.finalUrl}</span>
              </p>
            )}
            {domainWarning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm space-y-2">
                <p>⚠️ {domainWarning.message}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => runTest({ confirmDomain: true })} className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm font-medium cursor-pointer hover:bg-amber-500/30 transition-colors">
                    Yine de test et
                  </button>
                </div>
              </div>
            )}
            {serverlessWarning && (
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm space-y-2">
                <div className="flex gap-2 items-start">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-sky-200 mb-1">{serverlessWarning.platform} Altyapısı Tespit Edildi</p>
                    <p className="text-sky-300/80 text-xs leading-relaxed">{serverlessWarning.message}</p>
                  </div>
                </div>
              </div>
            )}
            {/* SEO bilgi/uyarı kutusu */}
            {seoInfo && !loading && (
              <div className={`p-3 rounded-lg text-sm space-y-2 ${
                !seoInfo.hasSitemap
                  ? "bg-orange-500/10 border border-orange-500/30 text-orange-300"
                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              }`}>
                {!seoInfo.hasSitemap ? (
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">⚠️</span>
                    <div>
                      <p className="font-semibold text-orange-200 mb-1">Google sitenizi tam olarak okuyamıyor!</p>
                      <p className="text-orange-300/80 text-xs leading-relaxed">
                        Sitemap.xml dosyanız bulunamadı. Google sayfalarınızı keşfedemiyor ve indeksleyemiyor olabilir. SEO performansınız ciddi şekilde etkilenebilir.
                        {!seoInfo.hasRobotsTxt && " Ayrıca robots.txt dosyanız da bulunamadı."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-lg shrink-0">✅</span>
                    <div>
                      <p className="font-semibold text-emerald-200 mb-1">
                        Sitemap tespit edildi{seoInfo.sitemapUrlCount ? `: ${seoInfo.sitemapUrlCount.toLocaleString("tr-TR")} sayfa` : ""}
                        {seoInfo.cms ? ` (${seoInfo.cms})` : ""}
                      </p>
                      <p className="text-emerald-300/80 text-xs leading-relaxed">
                        {seoInfo.sitemapUrlCount && seoInfo.sitemapUrlCount > 0
                          ? `Google günlük ~500–2.000 istek atar. ${seoInfo.sitemapUrlCount} sayfalık sitenizin bu trafiği karşılayıp karşılayamadığını test edin.`
                          : "Sitemap.xml dosyanız mevcut. Google sayfalarınızı keşfedebiliyor."}
                        {seoInfo.hasRobotsTxt && seoInfo.robotsAllowsCrawl === false && " Ancak robots.txt Googlebot erişimini engelliyor!"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Onay butonu — serverless ve/veya SEO uyarısı varsa tek buton göster */}
            {(serverlessWarning || seoInfo) && !loading && (
              <button
                type="button"
                onClick={() => runTest({
                  ...(serverlessWarning ? { confirmServerless: true } : {}),
                  confirmSeo: true,
                })}
                className={`w-full px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  serverlessWarning
                    ? "bg-sky-500/20 border border-sky-500/40 text-sky-200 hover:bg-sky-500/30"
                    : seoInfo && !seoInfo.hasSitemap
                      ? "bg-orange-500/20 border border-orange-500/40 text-orange-200 hover:bg-orange-500/30"
                      : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                }`}
              >
                {serverlessWarning ? "Yine de test et" : seoInfo && !seoInfo.hasSitemap ? "Yine de test et" : "Testi başlat"}
              </button>
            )}
            {error && !domainWarning && !serverlessWarning && !seoInfo && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
