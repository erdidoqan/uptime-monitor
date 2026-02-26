import { Metadata } from "next";
import { PageHeader } from "@/components/static";
import { PricingCard } from "@/components/static/pricing-card";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "UptimeTR için basit, şeffaf fiyatlandırma. Ücretsiz başlayın, ihtiyacınız olduğunda yükseltin.",
  alternates: {
    canonical: "https://www.uptimetr.com/pricing",
  },
  openGraph: {
    title: "Fiyatlandırma - UptimeTR",
    description: "UptimeTR için basit, şeffaf fiyatlandırma. Ücretsiz başlayın, ihtiyacınız olduğunda yükseltin.",
    url: "https://www.uptimetr.com/pricing",
  },
};

const pricingPlans = [
  {
    name: "Misafir",
    price: "Ücretsiz",
    description: "Kayıt olmadan UptimeTR'yi deneyin.",
    features: [
      { text: "1 monitör", included: true },
      { text: "7 gün çalışır", included: true },
      { text: "5, 10, 15 veya 30 dk aralıklar", included: true },
      { text: "Temel kontrol günlükleri", included: true },
      { text: "1 yük testi, max 50 eşzamanlı", included: true },
      { text: "Detaylı yük testi raporu", included: false },
      { text: "🇹🇷 Türkiye'den kontrol", included: false },
    ],
    buttonText: "Şimdi Dene",
    buttonHref: "/",
    highlighted: false,
  },
  {
    name: "Ücretsiz",
    price: "$0",
    period: "/ay",
    description: "Başlangıç yapan bireysel geliştiriciler için.",
    features: [
      { text: "1 monitör veya cron job", included: true },
      { text: "Sınırsız süre", included: true },
      { text: "Minimum 5 dakika aralık", included: true },
      { text: "2 yük testi, max 100 eşzamanlı", included: true },
      { text: "Özet yük testi raporu", included: true },
      { text: "Detaylı rapor + AI analizi", included: false },
      { text: "Durum sayfası oluşturma", included: false },
    ],
    buttonText: "Başla",
    buttonHref: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "/ay",
    description: "Geliştiriciler ve küçük ekipler için.",
    features: [
      { text: "Sınırsız monitör ve cron job", included: true },
      { text: "Minimum 1 dakika aralık", included: true },
      { text: "Sınırsız yük testi, 10.000 eşzamanlı", included: true },
      { text: "Detaylı rapor + AI analizi + grafik", included: true },
      { text: "Test geçmişi arşivi", included: true },
      { text: "🇹🇷 Türkiye'den kontrol", included: true },
      { text: "Durum sayfası + API erişimi", included: true },
    ],
    buttonText: "Pro'ya Geç",
    buttonHref: "#",
    highlighted: true,
    badge: "Popüler",
    polarCheckoutUrl: "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o",
  },
  {
    name: "Kurumsal",
    price: "Özel",
    description: "Büyük ölçekli kurumsal ihtiyaçlar için.",
    features: [
      { text: "Pro'daki her şey", included: true },
      { text: "Takım işbirliği", included: true },
      { text: "Rol tabanlı erişim kontrolü", included: true },
      { text: "1 yıl günlük saklama", included: true },
      { text: "Öncelikli destek", included: true },
      { text: "Özel entegrasyonlar", included: true },
      { text: "SLA garantisi", included: true },
    ],
    buttonText: "İletişime Geç",
    buttonHref: "mailto:info@digitexa.com",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { feature: "Monitör + Cron Job", guest: "1", free: "1", pro: "Sınırsız", enterprise: "Sınırsız" },
  { feature: "Süre", guest: "7 gün", free: "Sınırsız", pro: "Sınırsız", enterprise: "Sınırsız" },
  { feature: "Min Aralık", guest: "5 dk", free: "5 dk", pro: "1 dk", enterprise: "1 dk" },
  { feature: "Günlük Saklama", guest: "7 gün", free: "7 gün", pro: "90 gün", enterprise: "1 yıl" },
  { feature: "Yük Testi Hakkı", guest: "1", free: "2", pro: "Sınırsız", enterprise: "Sınırsız" },
  { feature: "Max Eşzamanlı Kullanıcı", guest: "50", free: "100", pro: "10.000", enterprise: "10.000" },
  { feature: "Detaylı Rapor + AI Analizi", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Test Geçmişi Arşivi", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "🇹🇷 Türkiye'den Kontrol", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "E-posta Bildirimleri", guest: "—", free: "✓", pro: "✓", enterprise: "✓" },
  { feature: "Webhook Bildirimleri", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Durum Sayfası", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "API Erişimi", guest: "—", free: "—", pro: "✓", enterprise: "✓" },
  { feature: "Takım Üyeleri", guest: "—", free: "1", pro: "1", enterprise: "Sınırsız" },
  { feature: "Destek", guest: "Topluluk", free: "E-posta", pro: "Öncelikli", enterprise: "Özel" },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        title="Basit, Şeffaf Fiyatlandırma"
        description="Ücretsiz başlayın, ihtiyacınız olduğunda yükseltin. Gizli ücret yok."
      />
      
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16">
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Planları Karşılaştır
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Özellik</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Misafir</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Ücretsiz</th>
                  <th className="text-center py-4 px-4 text-purple-400 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 text-white font-semibold">Kurumsal</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 px-4 text-gray-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.guest}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.free}</td>
                    <td className="py-4 px-4 text-center text-gray-300">{row.pro}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Link */}
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Fiyatlandırma hakkında sorularınız mı var?
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400">
            <Check className="h-4 w-4" />
            <a href="/faq" className="hover:underline">
              SSS&apos;i kontrol edin
            </a>
            <span className="text-gray-500">veya</span>
            <a href="/contact" className="hover:underline">
              Bize ulaşın
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
