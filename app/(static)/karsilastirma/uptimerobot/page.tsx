import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/static";
import { Check, X, ArrowRight, Zap, DollarSign, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "UptimeRobot vs UptimeTR - Hangisi Sizin İçin Daha Uygun?",
  description:
    "Cron job zamanlama ve uptime monitoring için UptimeRobot ve UptimeTR karşılaştırması. Özellikler, fiyatlandırma ve hangi servisi seçmeniz gerektiğini keşfedin.",
  alternates: {
    canonical: "https://www.uptimetr.com/karsilastirma/uptimerobot",
  },
  openGraph: {
    title: "UptimeRobot vs UptimeTR - Hangisi Sizin İçin Daha Uygun?",
    description:
      "Cron job zamanlama ve uptime monitoring için UptimeRobot ve UptimeTR karşılaştırması.",
    url: "https://www.uptimetr.com/karsilastirma/uptimerobot",
  },
};

// Hızlı karşılaştırma verileri
const quickComparison = [
  {
    feature: "Ücretsiz Plan Monitör Sayısı",
    uptimerobot: "50",
    uptimetr: "1",
    winner: "uptimerobot",
  },
  {
    feature: "Pro Plan Monitör Sayısı",
    uptimerobot: "50 ($7/ay)",
    uptimetr: "Sınırsız ($5/ay)",
    winner: "uptimetr",
  },
  {
    feature: "Minimum Kontrol Aralığı",
    uptimerobot: "5 dk (Ücretsiz) / 60 sn (Ücretli)",
    uptimetr: "5 dk (Ücretsiz) / 1 dk (Pro)",
    winner: "tie",
  },
  {
    feature: "Cron Job Çalıştırma",
    uptimerobot: "Yok (Sadece izleme)",
    uptimetr: "Var (Gerçek zamanlama)",
    winner: "uptimetr",
  },
  {
    feature: "Ücretsiz Deneme",
    uptimerobot: "Kayıt gerekli",
    uptimetr: "Kayıt olmadan misafir modu",
    winner: "uptimetr",
  },
  {
    feature: "Türkçe Arayüz",
    uptimerobot: "Yok",
    uptimetr: "Var",
    winner: "uptimetr",
  },
];

// Detaylı özellik karşılaştırması
const detailedComparison = {
  monitoring: {
    title: "Uptime Monitoring",
    features: [
      { name: "HTTP/HTTPS İzleme", uptimerobot: true, uptimetr: true },
      { name: "Keyword İzleme", uptimerobot: true, uptimetr: false },
      { name: "Ping İzleme", uptimerobot: true, uptimetr: false },
      { name: "Port İzleme", uptimerobot: true, uptimetr: false },
      { name: "SSL Sertifikası İzleme", uptimerobot: true, uptimetr: false },
      { name: "Domain Süresi İzleme", uptimerobot: true, uptimetr: false },
      { name: "DNS İzleme", uptimerobot: true, uptimetr: false },
      { name: "Özel HTTP Header", uptimerobot: true, uptimetr: true },
      { name: "Özel HTTP Body", uptimerobot: true, uptimetr: true },
      { name: "Tüm HTTP Metodları", uptimerobot: true, uptimetr: true },
    ],
  },
  cronjob: {
    title: "Cron Job Özellikleri",
    features: [
      { name: "Cron Job Çalıştırma", uptimerobot: false, uptimetr: true },
      { name: "Heartbeat/Cron İzleme", uptimerobot: true, uptimetr: true },
      { name: "Esnek Cron İfadeleri", uptimerobot: false, uptimetr: true },
      { name: "Curl Komutu Desteği", uptimerobot: false, uptimetr: true },
      { name: "Çalıştırma Günlükleri", uptimerobot: true, uptimetr: true },
      { name: "Response Body Kaydı", uptimerobot: false, uptimetr: true },
    ],
  },
  notifications: {
    title: "Bildirimler",
    features: [
      { name: "E-posta Bildirimleri", uptimerobot: true, uptimetr: true },
      { name: "SMS Bildirimleri", uptimerobot: true, uptimetr: false },
      { name: "Sesli Arama", uptimerobot: true, uptimetr: false },
      { name: "Webhook", uptimerobot: true, uptimetr: true },
      { name: "Slack Entegrasyonu", uptimerobot: true, uptimetr: false },
      { name: "Discord Entegrasyonu", uptimerobot: true, uptimetr: false },
      { name: "Telegram Entegrasyonu", uptimerobot: true, uptimetr: false },
      { name: "PagerDuty Entegrasyonu", uptimerobot: true, uptimetr: false },
    ],
  },
  statuspage: {
    title: "Status Page",
    features: [
      { name: "Public Status Page", uptimerobot: true, uptimetr: true },
      { name: "Özel Domain", uptimerobot: true, uptimetr: true },
      { name: "Özel Tasarım", uptimerobot: true, uptimetr: true },
      { name: "Çoklu Dil Desteği", uptimerobot: true, uptimetr: true },
      { name: "Abone Sistemi", uptimerobot: true, uptimetr: true },
      { name: "Bakım Duyuruları", uptimerobot: true, uptimetr: true },
    ],
  },
  other: {
    title: "Diğer Özellikler",
    features: [
      { name: "API Erişimi", uptimerobot: true, uptimetr: true },
      { name: "Mobil Uygulama", uptimerobot: true, uptimetr: false },
      { name: "2FA Güvenlik", uptimerobot: true, uptimetr: true },
      { name: "Takım Üyeleri", uptimerobot: true, uptimetr: true },
      { name: "Incident Yönetimi", uptimerobot: true, uptimetr: true },
    ],
  },
};

// Fiyatlandırma karşılaştırması
const pricingComparison = [
  {
    tier: "Ücretsiz",
    uptimerobot: { price: "$0", monitors: "50", interval: "5 dk", retention: "3 ay" },
    uptimetr: { price: "$0", monitors: "1", interval: "5 dk", retention: "7 gün" },
  },
  {
    tier: "Başlangıç",
    uptimerobot: { price: "$7/ay", monitors: "10", interval: "60 sn", retention: "12 ay" },
    uptimetr: { price: "$5/ay", monitors: "Sınırsız", interval: "1 dk", retention: "90 gün" },
  },
  {
    tier: "Takım",
    uptimerobot: { price: "$29/ay", monitors: "100", interval: "60 sn", retention: "24 ay" },
    uptimetr: { price: "$25/ay", monitors: "Sınırsız", interval: "1 dk", retention: "1 yıl" },
  },
];

export default function UptimeRobotComparisonPage() {
  return (
    <>
      <PageHeader
        title="UptimeRobot vs UptimeTR"
        description="İki popüler uptime monitoring servisini karşılaştırın ve ihtiyaçlarınıza en uygun olanı seçin."
      />

      <div className="mx-auto max-w-6xl px-6 lg:px-8 py-12 lg:py-16">
        {/* Intro Section */}
        <div className="mb-16">
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            <strong>UptimeRobot</strong>, 2010&apos;dan beri hizmet veren ve 2.5 milyondan fazla
            kullanıcıya sahip, sektörün en bilinen uptime monitoring servislerinden biridir.
            Kapsamlı izleme özellikleri ve geniş entegrasyon yelpazesi sunar.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            <strong>UptimeTR</strong> ise hem uptime monitoring hem de cron job zamanlama
            özelliklerini bir arada sunan, Türkçe arayüze sahip yeni nesil bir platformdur.
            UptimeRobot&apos;tan farklı olarak, sadece izleme yapmaz; aynı zamanda cron
            job&apos;larınızı gerçek zamanlı olarak çalıştırır.
          </p>
        </div>

        {/* Hızlı Karşılaştırma */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Hızlı Karşılaştırma</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Özellik</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">UptimeRobot</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-semibold">UptimeTR</th>
                </tr>
              </thead>
              <tbody>
                {quickComparison.map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 px-4 text-gray-300">{row.feature}</td>
                    <td
                      className={`py-4 px-4 text-center ${
                        row.winner === "uptimerobot" ? "text-green-400" : "text-gray-400"
                      }`}
                    >
                      {row.uptimerobot}
                    </td>
                    <td
                      className={`py-4 px-4 text-center ${
                        row.winner === "uptimetr" ? "text-green-400" : "text-gray-400"
                      }`}
                    >
                      {row.uptimetr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Temel Fark: Cron Job */}
        <section className="mb-20 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-2xl p-8 border border-white/10">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Temel Fark: Cron Job Zamanlama</h2>
              <p className="text-gray-400">
                UptimeRobot ve UptimeTR arasındaki en önemli fark budur.
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/30 rounded-xl p-6 border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-3">UptimeRobot</h3>
              <p className="text-gray-400 mb-4">
                &quot;Heartbeat monitoring&quot; özelliği ile cron job&apos;larınızın çalışıp
                çalışmadığını <strong>izler</strong>. Sizin cron job&apos;unuz bir endpoint&apos;e
                ping atmalıdır.
              </p>
              <div className="text-sm text-gray-500">
                <code className="bg-white/5 px-2 py-1 rounded">
                  Sizin sunucunuz → UptimeRobot&apos;a ping
                </code>
              </div>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-3">UptimeTR</h3>
              <p className="text-gray-400 mb-4">
                Cron job&apos;larınızı sizin adınıza <strong>çalıştırır</strong>. Kendi sunucunuzda
                cron yapılandırmanıza gerek yoktur.
              </p>
              <div className="text-sm text-gray-500">
                <code className="bg-white/5 px-2 py-1 rounded">
                  UptimeTR → Sizin endpoint&apos;inize istek
                </code>
              </div>
            </div>
          </div>
        </section>

        {/* Detaylı Özellik Karşılaştırması */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Detaylı Özellik Karşılaştırması</h2>
          <div className="space-y-8">
            {Object.values(detailedComparison).map((category) => (
              <div key={category.title} className="border border-white/10 rounded-xl overflow-hidden">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">{category.title}</h3>
                </div>
                <div className="divide-y divide-white/5">
                  {category.features.map((feature, index) => (
                    <div key={index} className="flex items-center px-6 py-3">
                      <span className="flex-1 text-gray-300">{feature.name}</span>
                      <div className="w-32 text-center">
                        {feature.uptimerobot ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 mx-auto" />
                        )}
                      </div>
                      <div className="w-32 text-center">
                        {feature.uptimetr ? (
                          <Check className="w-5 h-5 text-green-400 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-600 mx-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-8 mt-6 text-sm text-gray-500">
            <span>UptimeRobot</span>
            <span className="text-purple-400">UptimeTR</span>
          </div>
        </section>

        {/* Fiyatlandırma Karşılaştırması */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Fiyatlandırma Karşılaştırması</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Plan</th>
                  <th className="text-center py-4 px-4 text-white font-semibold" colSpan={2}>
                    UptimeRobot
                  </th>
                  <th className="text-center py-4 px-4 text-purple-400 font-semibold" colSpan={2}>
                    UptimeTR
                  </th>
                </tr>
                <tr className="border-b border-white/10 text-sm">
                  <th></th>
                  <th className="py-2 px-2 text-gray-500 font-normal">Fiyat</th>
                  <th className="py-2 px-2 text-gray-500 font-normal">Monitör</th>
                  <th className="py-2 px-2 text-gray-500 font-normal">Fiyat</th>
                  <th className="py-2 px-2 text-gray-500 font-normal">Monitör</th>
                </tr>
              </thead>
              <tbody>
                {pricingComparison.map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 px-4 text-gray-300 font-medium">{row.tier}</td>
                    <td className="py-4 px-2 text-center text-gray-400">{row.uptimerobot.price}</td>
                    <td className="py-4 px-2 text-center text-gray-400">
                      {row.uptimerobot.monitors}
                    </td>
                    <td className="py-4 px-2 text-center text-gray-300">{row.uptimetr.price}</td>
                    <td className="py-4 px-2 text-center text-gray-300">{row.uptimetr.monitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Avantajlar */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Hangi Durumlarda Hangisi?</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* UptimeRobot */}
            <div className="border border-white/10 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                UptimeRobot Tercih Edilebilir
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Çok sayıda ücretsiz monitör ihtiyacınız varsa (50 adet)</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>SSL, DNS, Domain süresi gibi gelişmiş izleme özelliklerine ihtiyacınız varsa</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Slack, Discord, PagerDuty gibi entegrasyonlar kritikse</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Mobil uygulama kullanmak istiyorsanız</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Uzun süreli data saklama önemliyse (24 aya kadar)</span>
                </li>
              </ul>
            </div>

            {/* UptimeTR */}
            <div className="border border-purple-500/30 rounded-xl p-6 bg-purple-500/5">
              <h3 className="text-xl font-semibold text-white mb-4">UptimeTR Tercih Edilebilir</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Cron job çalıştırma</strong> ihtiyacınız varsa (en önemli fark)
                  </span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Sınırsız monitör istiyorsanız (Pro: $5/ay)</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Kayıt olmadan hızlıca test etmek istiyorsanız</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Türkçe arayüz tercih ediyorsanız</span>
                </li>
                <li className="flex items-start gap-3 text-gray-400">
                  <Check className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Daha uygun fiyatlı pro plan arıyorsanız</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Sonuç ve CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Sonuç</h2>
          <p className="text-lg text-gray-400 mb-8 max-w-3xl mx-auto">
            UptimeRobot, kapsamlı izleme özellikleri ve geniş entegrasyon yelpazesiyle olgun bir
            platformdur. UptimeTR ise cron job zamanlama özelliğiyle öne çıkar ve daha uygun
            fiyatla sınırsız monitör sunar. İhtiyaçlarınıza göre doğru seçimi yapın.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                UptimeTR&apos;yi Deneyin
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                Fiyatlandırmayı İnceleyin
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
