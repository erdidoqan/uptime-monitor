"use client";

import React from "react";
import { BrowserTestFormCard } from "@/components/browser-test/browser-test-form-card";
import { useBrowserTest } from "@/hooks/use-browser-test";

export default function BrowserTestPage() {
  const bt = useBrowserTest();

  return (
    <>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Sol: Başlık ve açıklama */}
            <div className="space-y-6 lg:pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-medium text-cyan-300">Gerçek Trafik</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Sitenize<br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Gerçek Trafik Gönderin
                </span>
              </h1>

              <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
                Gerçek kullanıcılar sitenizi ziyaret eder —
                sayfalarınızı açar, gezinir ve etkileşime girer. Google Analytics&apos;te
                <strong className="text-gray-300"> organik ziyaretçi</strong> olarak görünürler.
              </p>

              <div className="space-y-3 text-sm text-gray-400">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>
                  <span>Gerçek tarayıcı ziyaretleri — Analytics&apos;te görünür</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>
                  <span>Organik arama trafiği — Google, Bing, Yahoo kaynaklı ziyaretler</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>
                  <span>300+ eşzamanlı gerçek ziyaretçi sitenizde</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-0.5 shrink-0">✓</span>
                  <span>Türkiye dahil farklı lokasyonlardan ziyaretçiler</span>
                </div>
              </div>
            </div>

            {/* Sağ: Form */}
            <div>
              <BrowserTestFormCard
                url={bt.url}
                setUrl={bt.setUrl}
                targetBrowsers={bt.targetBrowsers}
                setTargetBrowsers={bt.setTargetBrowsers}
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
                freeTestsUsed={bt.freeTestsUsed}
                runTest={bt.runTest}
                stopTest={bt.stopTest}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Saving phase ── */}
      {bt.savingPhase && (
        <section className="py-12 border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
              <svg className="animate-spin h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-gray-300">Ziyaretler tamamlandı! Rapor hazırlanıyor...</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Bilgi Kartları ── */}
      <section className="py-16 lg:py-24 border-t border-white/10">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12 text-center">
            Neden Gerçek Trafik?
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Gerçek Kullanıcılar</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Bot trafiği değil, gerçek tarayıcı ziyaretleri. Sayfalar tam yüklenir,
                kullanıcılar gezinir — tıpkı gerçek bir ziyaretçi gibi.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Organik Arama Trafiği</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Trafik Google, Bing, Yahoo gibi arama motorlarından gelir görünür.
                Analytics&apos;te &quot;Organic Search&quot; olarak raporlanır — doğal ve organik.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Analytics&apos;te Görünür</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ziyaretçiler Google Analytics, Hotjar, Clarity gibi tüm analitik araçlarında
                gerçek kullanıcı olarak görünür. Aktif kullanıcı sayınız anında artar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 002.248-2.354M12 12.75a2.25 2.25 0 01-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 00-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 01.4-2.253M12 8.25a2.25 2.25 0 00-2.248 2.146M12 8.25a2.25 2.25 0 012.248 2.146M8.683 5a6.032 6.032 0 01-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0115.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 00-.575-1.752M4.921 6a24.048 24.048 0 00-.392 3.314c1.668.546 3.416.914 5.22 1.092M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 01-5.22 1.092" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Lokasyon Desteği</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ziyaretçiler Türkiye dahil farklı lokasyonlardan gelir.
                Hedef kitlenizin bulunduğu ülkeden gerçek IP&apos;lerle organik kullanıcılar.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
