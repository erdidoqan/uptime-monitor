const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Gerçek Zamanlı İzleme",
    description: "Web sitelerinizi ve API'lerinizi sürekli izleyin. Servisleriniz çöktüğünde veya yavaş yanıt verdiğinde anında bildirim alın.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Esnek Kontrol Aralıkları",
    description: "İhtiyacınıza göre kontrol sıklığını belirleyin. 5 dakikadan 30 dakikaya kadar farklı aralıklarla web sitelerinizi izleyin.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Yıldırım Hızı",
    description: "Global edge çalıştırma için Cloudflare Workers üzerine kurulu. Kontrolleriniz minimum gecikme için sunucularınıza yakın çalışır.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Detaylı Analitik",
    description: "Yanıt sürelerini, uptime oranlarını ve geçmiş verileri takip edin. Kalıpları belirleyin ve web sitenizin performansını optimize edin.",
    gradient: "from-blue-500 to-cyan-500",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 relative bg-[#0a0a0b]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            <span className="gradient-text">Uptime izleme</span> için ihtiyacınız olan her şey
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Web sitelerinizi kesintisiz çalıştırmak için basit ama güçlü araçlar. Karmaşık kurulum gerekmez.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-[#18181b] border border-white/10 hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
