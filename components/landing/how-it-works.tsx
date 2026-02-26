const steps = [
  {
    number: "01",
    title: "URL'nizi Ekleyin",
    description: "İzlemek istediğiniz web sitesinin veya API'nin URL'sini girin. HTTP/HTTPS protokollerini destekliyoruz.",
    code: `// İzlenecek URL
https://example.com

// veya API endpoint'i
https://api.example.com/health`,
  },
  {
    number: "02",
    title: "Kontrol Aralığını Seçin",
    description: "Web sitenizi ne sıklıkla kontrol edeceğinizi belirleyin. 5, 10, 15 veya 30 dakikalık aralıklar arasından seçim yapın.",
    code: `// Kontrol aralıkları
Her 5 dakika   → Kritik servisler
Her 10 dakika  → Önemli sayfalar
Her 15 dakika  → Genel izleme
Her 30 dakika  → Düşük öncelikli`,
  },
  {
    number: "03",
    title: "Bilgilendirilmiş Olun",
    description: "Web siteniz çöktüğünde veya düzeldiğinde anında bildirim alın. Yanıt sürelerini takip edin ve detaylı uptime geçmişini görüntüleyin.",
    code: `✓ Durum: 200 OK
✓ Süre: 145ms
✓ Son kontrol: Az önce
✓ Sonraki kontrol: 5 dk içinde

// Hata uyarısı
⚠ example.com çalışmıyor
  Durum: 503
  Süre: 30000ms (zaman aşımı)`,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 relative bg-[#0f0f10]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Nasıl <span className="gradient-text">Çalışır</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Dakikalar içinde başlayın. Karmaşık yapılandırma veya altyapı kurulumu gerekmez.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
                  Adım {step.number}
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-lg text-gray-400 mb-6">{step.description}</p>
              </div>

              {/* Code Block */}
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <div className="code-block p-5 shadow-xl">
                  {/* Window Controls */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <pre className="text-sm leading-relaxed overflow-x-auto">
                    <code className="text-gray-300">{step.code}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
