"use client";

import { useState, useEffect, useRef } from "react";
import { GoogleSignInButton } from "@/components/landing/google-sign-in-button";
import {
  FREE_MAX_TESTS,
  GUEST_MAX_TESTS,
  GUEST_MAX_VISITS,
  FREE_MAX_VISITS,
  SLIDER_MIN,
  SLIDER_MAX,
  SLIDER_STEP,
} from "@/lib/browser-test-limits";
import type { BrowserRampProgress, TrafficSource, SessionDuration } from "@/hooks/use-browser-test";
import type { UserTier } from "@/lib/browser-test-limits";

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

/* ── Visitor Messages ── */
const VISITOR_MESSAGES = [
  "Yeni ziyaretçi sitenize ulaştı",
  "Bir kullanıcı sayfanızı görüntülüyor",
  "Ziyaretçi sitenizde geziniyor",
  "Yeni bir kullanıcı bağlandı",
  "Sayfa başarıyla yüklendi",
  "Ziyaretçi sayfanızı inceliyor",
  "Yeni kullanıcı sitenize girdi",
  "Bir ziyaretçi içeriğinizi okuyor",
];

const WAITING_MESSAGES = [
  "Kullanıcılar hazırlanıyor",
  "Tarayıcılar açılıyor",
  "Sitenize bağlanılıyor",
  "Sayfanız yükleniyor",
  "Ziyaretçiler yolda",
  "Oturumlar oluşturuluyor",
];

const VISITOR_COLORS = [
  "from-cyan-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-pink-400 to-rose-500",
  "from-sky-400 to-indigo-500",
];

/* ── Live Progress Panel ── */
function LiveProgressPanel({
  rampProgress,
  stopTest,
}: {
  rampProgress: BrowserRampProgress;
  stopTest: () => void;
}) {
  const prevVisitsRef = useRef(0);
  const feedIdRef = useRef(0);
  const [feedMessages, setFeedMessages] = useState<Array<{ id: number; text: string; color: string }>>([]);
  const [visitorDots, setVisitorDots] = useState<Array<{ id: number; color: string }>>([]);
  const [countPulse, setCountPulse] = useState(false);
  const [waitingMsgIdx, setWaitingMsgIdx] = useState(0);
  const [waitingDots, setWaitingDots] = useState(1);

  const isWaiting = rampProgress.liveVisits === 0;

  useEffect(() => {
    if (!isWaiting) return;
    const msgTimer = setInterval(() => {
      setWaitingMsgIdx(prev => (prev + 1) % WAITING_MESSAGES.length);
    }, 2500);
    const dotTimer = setInterval(() => {
      setWaitingDots(prev => prev >= 3 ? 1 : prev + 1);
    }, 600);
    return () => { clearInterval(msgTimer); clearInterval(dotTimer); };
  }, [isWaiting]);

  useEffect(() => {
    const diff = rampProgress.liveVisits - prevVisitsRef.current;
    if (diff <= 0) return;
    prevVisitsRef.current = rampProgress.liveVisits;

    for (let i = 0; i < diff; i++) {
      feedIdRef.current++;
      const id = feedIdRef.current;
      const color = VISITOR_COLORS[id % VISITOR_COLORS.length];

      setCountPulse(true);
      setTimeout(() => setCountPulse(false), 400);

      setVisitorDots(prev => [...prev, { id, color }].slice(-40));

      if (i % 2 === 0) {
        const text = VISITOR_MESSAGES[id % VISITOR_MESSAGES.length];
        setFeedMessages(prev => [{ id, text, color }, ...prev].slice(0, 4));
      }
    }
  }, [rampProgress.liveVisits]);

  return (
    <div className="mt-4 rounded-xl bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-medium text-emerald-400">Canlı</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-gray-400">
            Browser {rampProgress.currentBrowser}/{rampProgress.totalBrowsers}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); stopTest(); }}
          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
        >
          Durdur
        </button>
      </div>

      {/* Browser progress bar */}
      <div className="px-3 sm:px-4 pb-2">
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${rampProgress.totalBrowsers > 0 ? (rampProgress.currentBrowser / rampProgress.totalBrowsers) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Waiting State */}
      {isWaiting && (
        <div className="px-3 sm:px-4 pb-3">
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: Math.min(rampProgress.totalBrowsers, 10) }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center"
                style={{
                  animation: "btPulseGhost 2s ease-in-out infinite",
                  animationDelay: `${i * 200}ms`,
                }}
              >
                <svg className="w-3.5 h-3.5 text-white/20" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-gray-400">
              {WAITING_MESSAGES[waitingMsgIdx]}{".".repeat(waitingDots)}
            </span>
          </div>
        </div>
      )}

      {/* Visitor Dots */}
      {visitorDots.length > 0 && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex flex-wrap gap-1">
            {visitorDots.map((dot) => (
              <div
                key={dot.id}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br ${dot.color} flex items-center justify-center shadow-lg`}
                style={{
                  animation: "btPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                  opacity: 0,
                }}
              >
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="px-3 sm:px-4 py-2 border-t border-white/5">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Ziyaret</dt>
            <dd className={`text-lg font-bold tabular-nums transition-all duration-300 ${
              countPulse ? "text-cyan-300 scale-110" : "text-white scale-100"
            }`}>
              {rampProgress.liveVisits}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Başarılı</dt>
            <dd className={`text-lg font-bold tabular-nums transition-all duration-300 ${
              countPulse ? "text-emerald-300 scale-110" : "text-emerald-400 scale-100"
            }`}>
              {rampProgress.liveOk}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-gray-500 uppercase tracking-wider">Hata</dt>
            <dd className="text-lg font-bold text-red-400 tabular-nums">
              {rampProgress.liveErrors}
            </dd>
          </div>
        </dl>
      </div>

      {/* Live Feed */}
      {feedMessages.length > 0 && (
        <div className="px-3 sm:px-4 py-2 border-t border-white/5 space-y-1.5">
          {feedMessages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-center gap-2 text-xs"
              style={{ animation: "btSlideIn 0.4s ease-out forwards" }}
            >
              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${msg.color} flex-shrink-0 flex items-center justify-center`}>
                <svg className="w-2.5 h-2.5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <span className="text-gray-400">{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* GA delay hint */}
      {rampProgress.liveVisits > 0 && (
        <div className="px-3 sm:px-4 py-2 border-t border-white/5">
          <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
            <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Google Analytics 20-30 sn gecikmeli gösterim yapabilir
          </p>
        </div>
      )}

      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes btPopIn {
          0% { opacity: 0; transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes btSlideIn {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes btPulseGhost {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

/* ── Traffic Source Options ── */
const TRAFFIC_SOURCES: Array<{ value: TrafficSource; label: string; desc: string; icon: string }> = [
  { value: "direct", label: "Doğrudan", desc: "Direkt URL ziyareti", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { value: "organic", label: "Organik Arama", desc: "Google, Bing, Yahoo", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { value: "social", label: "Sosyal Medya", desc: "Facebook, X, Instagram", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
];

/* ── Session Duration Options ── */
const SESSION_OPTIONS: Array<{ value: SessionDuration; label: string; desc: string; proOnly: boolean }> = [
  { value: "fast", label: "Hızlı ziyaret", desc: "~2s kalma", proOnly: false },
  { value: "realistic", label: "Gerçekçi ziyaret", desc: "~15s, düşük bounce rate", proOnly: true },
  { value: "long", label: "Uzun ziyaret", desc: "~30s, çok düşük bounce rate", proOnly: true },
];

/* ── GA Info Text ── */
function getGaInfoText(source: TrafficSource): string {
  switch (source) {
    case "direct":
      return "Ziyaretçiler Google Analytics'te doğrudan trafik olarak görünür.";
    case "organic":
      return "Ziyaretçiler Google Analytics'te gerçek kullanıcı olarak görünür. Kaynak: organik arama (Google, Bing, Yahoo).";
    case "social":
      return "Ziyaretçiler Google Analytics'te gerçek kullanıcı olarak görünür. Kaynak: sosyal medya (Facebook, X, Instagram).";
  }
}

/* ── Props ── */
interface BrowserTestFormCardProps {
  url: string;
  setUrl: (url: string) => void;
  targetVisits: number;
  setTargetVisits: (n: number) => void;
  useProxy: boolean;
  setUseProxy: (v: boolean) => void;
  trafficSource: TrafficSource;
  setTrafficSource: (v: TrafficSource) => void;
  sessionDuration: SessionDuration;
  setSessionDuration: (v: SessionDuration) => void;
  loading: boolean;
  rampProgress: BrowserRampProgress | null;
  error: string | null;
  domainWarning: { message: string; domain: string } | null;
  redirectInfo: { originalUrl: string; finalUrl: string; redirectCount: number } | null;
  savingPhase: boolean;
  isAuth: boolean;
  userTier: UserTier;
  guestTestDone: boolean;
  guestTestCount: number;
  freeTestsUsed: number;
  runTest: (opts?: { confirmDomain?: boolean }) => void;
  stopTest: () => void;
}

export function BrowserTestFormCard({
  url,
  setUrl,
  targetVisits,
  setTargetVisits,
  useProxy,
  setUseProxy,
  trafficSource,
  setTrafficSource,
  sessionDuration,
  setSessionDuration,
  loading,
  rampProgress,
  error,
  domainWarning,
  savingPhase,
  isAuth,
  userTier,
  guestTestDone,
  guestTestCount,
  freeTestsUsed,
  runTest,
  stopTest,
}: BrowserTestFormCardProps) {
  const isPro = userTier === "pro" || userTier === "enterprise";

  const isGuestBlocked = !isAuth && guestTestDone;
  const isFreeBlocked = isAuth && userTier === "free" && freeTestsUsed >= FREE_MAX_TESTS;
  const isTestLimitReached = isGuestBlocked || isFreeBlocked;

  const needsAuth = !isAuth && targetVisits > GUEST_MAX_VISITS;
  const needsPro = isAuth && !isPro && targetVisits > FREE_MAX_VISITS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsAuth || needsPro || isTestLimitReached) return;
    if (!loading) runTest();
  };

  if (rampProgress) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <p className="text-xs text-gray-500 mb-1">Hedef</p>
          <p className="text-sm text-white truncate break-all">{url}</p>
        </div>
        <LiveProgressPanel rampProgress={rampProgress} stopTest={stopTest} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-4 sm:p-6 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* URL Input */}
        <div>
          <label htmlFor="bt-url" className="block text-sm font-medium text-gray-300 mb-1.5">
            Hedef URL
          </label>
          <input
            id="bt-url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition-all disabled:opacity-50"
            required
          />
        </div>

        {/* Visit Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="bt-visits" className="text-sm font-medium text-gray-300">
              Tahmini ziyaret
            </label>
            <span className="text-sm font-bold text-white tabular-nums">{targetVisits}</span>
          </div>
          <input
            id="bt-visits"
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={targetVisits}
            onChange={(e) => setTargetVisits(Number(e.target.value))}
            disabled={loading}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{SLIDER_MIN}</span>
            {!isPro && (
              <span className="text-cyan-500/60">{FREE_MAX_VISITS} (Free)</span>
            )}
            <span>{SLIDER_MAX} (Pro)</span>
          </div>
        </div>

        {/* Traffic Source Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Trafik kaynağı</label>
          <div className="grid grid-cols-3 gap-2">
            {TRAFFIC_SOURCES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                onClick={(e) => { e.preventDefault(); setTrafficSource(opt.value); }}
                className={`relative p-2.5 rounded-lg border text-center transition-all ${
                  trafficSource === opt.value
                    ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                } ${loading ? "opacity-50" : "cursor-pointer"}`}
              >
                <svg className={`w-4 h-4 mx-auto mb-1 ${trafficSource === opt.value ? "text-cyan-400" : "text-gray-500"}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
                <div className={`text-[11px] font-medium ${trafficSource === opt.value ? "text-white" : "text-gray-400"}`}>
                  {opt.label}
                </div>
                <div className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Session Duration Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Oturum süresi</label>
          <div className="grid grid-cols-3 gap-2">
            {SESSION_OPTIONS.map((opt) => {
              const locked = opt.proOnly && !isPro;
              const isSelected = sessionDuration === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading || locked}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!locked) setSessionDuration(opt.value);
                  }}
                  className={`relative p-2.5 rounded-lg border text-center transition-all ${
                    isSelected
                      ? "border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                      : locked
                        ? "border-white/5 bg-white/[0.02] opacity-60"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                  } ${loading || locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className={`text-[11px] font-medium ${isSelected ? "text-white" : "text-gray-400"}`}>
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</div>
                  {locked && (
                    <span className="absolute top-1 right-1 text-[8px] bg-purple-500/20 text-purple-300 px-1 rounded">
                      Pro
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Türkiye Proxy Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇹🇷</span>
            <div>
              <span className="text-sm text-white font-medium">Türk kullanıcılar</span>
              <p className="text-[10px] text-gray-500">Ziyaretçiler Türkiye&apos;den gelir</p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setUseProxy(!useProxy); }}
            disabled={loading}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              useProxy ? "bg-emerald-500" : "bg-white/10"
            } ${loading ? "opacity-50" : "cursor-pointer"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                useProxy ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* GA Uyarısı */}
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          {getGaInfoText(trafficSource)}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Domain Warning */}
        {domainWarning && !loading && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-200 mb-2">{domainWarning.message}</p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); runTest({ confirmDomain: true }); }}
              className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Yine de devam et
            </button>
          </div>
        )}

        {/* Guest test limit reached */}
        {isGuestBlocked && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Misafir kullanım hakkınız doldu. Devam etmek için giriş yapın.
            </p>
            <GoogleSignInButton />
          </div>
        )}

        {/* Free test limit reached */}
        {isFreeBlocked && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Ücretsiz {FREE_MAX_TESTS} kullanım hakkınızı kullandınız. Sınırsız kullanım için Pro planına geçin.
            </p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Pro Planına Geç — $5/ay
            </button>
          </div>
        )}

        {/* Dynamic submit button */}
        {!isTestLimitReached && needsAuth && (
          <div className="space-y-2">
            <p className="text-center text-xs text-gray-500">
              {targetVisits} ziyaret için giriş yapmanız gerekiyor
            </p>
            <GoogleSignInButton className="w-full" />
          </div>
        )}

        {!isTestLimitReached && needsPro && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20"
          >
            {targetVisits} ziyaret için Pro Planına Geç — $5/ay
          </button>
        )}

        {!isTestLimitReached && !needsAuth && !needsPro && (
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm disabled:opacity-50 cursor-pointer hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/20"
          >
            {loading
              ? savingPhase
                ? "Rapor hazırlanıyor..."
                : "Ziyaretçiler sitenizde..."
              : "Ziyaretçileri Gönder"}
          </button>
        )}

        {/* Remaining tests info */}
        {isAuth && userTier === "free" && !isFreeBlocked && (
          <p className="text-center text-xs text-gray-500">
            {FREE_MAX_TESTS - freeTestsUsed} / {FREE_MAX_TESTS} kullanım hakkı kaldı
          </p>
        )}
        {!isAuth && !isGuestBlocked && !needsAuth && (
          <p className="text-center text-xs text-gray-500">
            {GUEST_MAX_TESTS - guestTestCount} / {GUEST_MAX_TESTS} kullanım hakkı kaldı · Giriş yaparak daha fazla test hakkı kazanın
          </p>
        )}
      </form>
    </div>
  );
}
