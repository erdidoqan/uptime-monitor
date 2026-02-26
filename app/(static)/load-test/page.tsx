"use client";

import React, { useRef, useEffect } from "react";
import { LoadTestHero } from "@/components/landing/load-test-hero";
import { useLoadTest } from "@/hooks/use-load-test";
import { trackLoadTestPageView } from "@/lib/analytics";

/* ───────── Re-exports (LoadTestHero, FormCard gibi component'ler kullanıyor) ───────── */
export type { RampProgress } from "@/hooks/use-load-test";
export type { UserTier } from "@/lib/load-test-limits";

/* ───────── Page Component ───────── */

export default function LoadTestPage() {
  const formRef = useRef<HTMLDivElement>(null);
  const lt = useLoadTest();

  useEffect(() => {
    trackLoadTestPageView();
  }, []);

  return (
    <>
      <LoadTestHero
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
      />

      {/* ── Serverless uyarısı ── */}
      {lt.serverlessWarning && (
        <div className="mx-auto max-w-3xl px-6 lg:px-8 pt-6">
          <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
            <div className="flex gap-3">
              <div className="shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-sky-300 mb-1">
                  {lt.serverlessWarning.platform} Altyapısı Tespit Edildi
                </p>
                <p className="text-xs text-sky-300/70 leading-relaxed">
                  {lt.serverlessWarning.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Kaydetme / yönlendirme aşaması ── */}
      {lt.savingPhase && (
        <section ref={formRef} className="py-12 lg:py-16 border-t border-white/10">
          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
              <svg className="animate-spin h-5 w-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-gray-300">
                Test tamamlandı! Sonuçlar kaydediliyor...
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Yük Testi Neden Önemli? ── */}
      <section className="py-16 lg:py-24 border-t border-white/10">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-12 text-center">
            Yük Testi Neden Önemli?
          </h2>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Kart 1 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Anlık Trafik Patlamaları</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Bir sosyal medya paylaşımı, haber sitesinde çıkan bir yazı veya başarılı bir reklam kampanyası sitenize anlık olarak binlerce ziyaretçi yönlendirebilir. Siteniz bu yüke hazır değilse, en kritik anda çöker ve potansiyel müşterilerinizi kaybedersiniz.
              </p>
            </div>

            {/* Kart 2 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Yavaş Site = Kayıp Müşteri</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Araştırmalar, sayfa yüklenme süresinin 3 saniyeyi aşması durumunda ziyaretçilerin %53&apos;ünün siteyi terk ettiğini gösteriyor. Yük testi ile sitenizin kaç kişiye kadar sorunsuz hizmet verdiğini ve nerede yavaşlamaya başladığını önceden görürsünüz.
              </p>
            </div>

            {/* Kart 3 — Google SEO */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 md:col-span-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Google SEO ve Site Hızı</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-3">
                Google, sitenizi dizine eklemek için düzenli olarak <strong className="text-gray-300">Googlebot</strong> ile tarar (crawl). Bu tarama sırasında Google, sitenizin yanıt süresini ölçer ve buna göre bir <strong className="text-gray-300">crawl bütçesi</strong> belirler.
              </p>
              <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                <div className="flex gap-3">
                  <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                  <p><strong className="text-gray-300">Hızlı site:</strong> Google daha sık ve daha fazla sayfa tarar. Yeni içerikleriniz daha çabuk dizine eklenir, sıralamanız yükselir.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  <p><strong className="text-gray-300">Yavaş site:</strong> Google tarama hızını düşürür, bazı sayfalarınızı hiç taramaz. Sunucunuza yük bindirmemek için crawl bütçenizi kısar — sonuç olarak sayfalarınız arama sonuçlarında geri kalır.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  <p><strong className="text-gray-300">Çöken site:</strong> Googlebot 5xx hatası aldığında sayfayı dizinden düşürmeye başlar. Uzun süreli erişilemezlik, organik trafiğinizi ciddi şekilde düşürür.</p>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  💡 Google&apos;ın <strong>Core Web Vitals</strong> metrikleri (LCP, FID, CLS) doğrudan sıralama faktörüdür. Yük testi ile sunucunuzun yoğun trafik altındaki gerçek yanıt süresini ölçerek, SEO performansınızı önceden değerlendirebilirsiniz.
                </p>
              </div>
            </div>

            {/* Kart 4 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Güvenle Ölçeklenin</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Yeni bir özellik yayınlamadan, kampanya başlatmadan veya sunucu planı değiştirmeden önce yük testi yapın. Altyapınızın gerçek limitlerini bilin ve sürprizlerle karşılaşmayın.
              </p>
            </div>

            {/* Kart 5 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Kademeli Stres Testi</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Testlerimiz kullanıcı sayısını kademeli olarak artırır. Böylece sitenizin tam olarak kaç kişide yavaşlamaya başladığını, kaç kişide hata verdiğini ve kaç kişide tamamen çöktüğünü net olarak görürsünüz.
              </p>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
