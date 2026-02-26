"use client";

import { ShaderBackground } from "./shader-background";
import { LoadTestFormCard } from "@/components/load-test/load-test-form-card";
import type { RampProgress } from "@/hooks/use-load-test";
import type { UserTier } from "@/lib/load-test-limits";
import type { SeoInfo } from "@/lib/load-test-analyze";

/* ── Props ── */

interface LoadTestHeroProps {
  url: string;
  setUrl: (url: string) => void;
  runTest: (opts?: { confirmDomain?: boolean; confirmServerless?: boolean }) => void;
  loading: boolean;
  rampProgress: RampProgress | null;
  error: string | null;
  redirectInfo: {
    originalUrl: string;
    finalUrl: string;
    redirectCount: number;
  } | null;
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
}

/* ── Hero Component ── */

export function LoadTestHero({
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
}: LoadTestHeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0">
        <ShaderBackground />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b] via-transparent to-transparent from-0% via-25% to-50%" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent from-0% via-15% to-40%" />
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Text Content */}
          <div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6"
              style={{
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Website ve API&apos;nize
              <br />
              <span className="gradient-text">anlık yük testi.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/80 max-w-xl leading-relaxed mb-8">
              10.000 trafik geldiğinde siteniz ne yapıyor? Hemen test edin,
              sonuçları anında görün.
            </p>
            <div className="flex flex-wrap gap-8 mb-8">
              <div>
                <div className="text-3xl font-bold text-white">10.000</div>
                <div className="text-sm text-white/60">Eşzamanlı kullanıcı</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Ücretsiz</div>
                <div className="text-sm text-white/60">Kayıtsız deneme</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">AI Analiz</div>
                <div className="text-sm text-white/60">Otomatik yorum</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                "Kademeli yük artışı ile gerçekçi test",
                "Canlı performans izleme ve uyarılar",
                "AI destekli detaylı analiz raporu",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Form Card */}
          <div className="lg:pl-8">
            <LoadTestFormCard
              url={url}
              setUrl={setUrl}
              runTest={runTest}
              loading={loading}
              rampProgress={rampProgress}
              error={error}
              redirectInfo={redirectInfo}
              stopTest={stopTest}
              isAuth={isAuth}
              userTier={userTier}
              guestTestDone={guestTestDone}
              concurrentUsers={concurrentUsers}
              setConcurrentUsers={setConcurrentUsers}
              domainWarning={domainWarning}
              serverlessWarning={serverlessWarning}
              seoInfo={seoInfo}
              freeTestsUsed={freeTestsUsed}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
