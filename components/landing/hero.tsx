import { ShaderBackground } from "./shader-background";
import { HeroCronForm } from "./hero-cron-form";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* WebGL Shader Background */}
      <div className="absolute inset-0">
        <ShaderBackground />
      </div>

      {/* Top Gradient Overlay - Fade from dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b] via-transparent to-transparent from-0% via-25% to-50%"></div>
      
      {/* Bottom Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent from-0% via-15% to-40%"></div>
      
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}></div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Text Content */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight mb-6" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
              Schedule cron jobs.
              <br />
              <span className="gradient-text">Monitor uptime.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/80 max-w-xl leading-relaxed mb-8">
              Keep your APIs healthy with scheduled HTTP requests. Monitor endpoints, track response times, and get notified when things go wrong.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 mb-8">
              <div>
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-white/60">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">&lt;100ms</div>
                <div className="text-sm text-white/60">Avg Latency</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-white/60">Monitoring</div>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              {[
                'Real-time HTTP endpoint monitoring',
                'Flexible cron expressions & intervals',
                'Instant failure notifications',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Cron Form */}
          <div className="lg:pl-8">
            <HeroCronForm />
          </div>
        </div>
      </div>
    </section>
  );
}

