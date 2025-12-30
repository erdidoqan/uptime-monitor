import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Real-time Monitoring",
    description: "Monitor your HTTP endpoints continuously. Get instant notifications when your services go down or respond slowly.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Flexible Scheduling",
    description: "Use cron expressions for complex schedules or simple intervals. Run jobs every minute, hour, day, or custom patterns.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Lightning Fast",
    description: "Built on Cloudflare Workers for global edge execution. Your cron jobs run close to your servers for minimal latency.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Detailed Analytics",
    description: "Track response times, success rates, and historical data. Identify patterns and optimize your API performance.",
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
            Everything you need for <span className="gradient-text">uptime monitoring</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Simple yet powerful tools to keep your services running smoothly. No complex setup required.
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

        {/* Quick Links */}
        <div className="mt-16 pt-12 border-t border-white/10">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Popular Schedules */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Popular Schedules
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Every 5 min", href: "/cron-every-5-minutes" },
                  { name: "Every 10 min", href: "/cron-every-10-minutes" },
                  { name: "Every 15 min", href: "/cron-every-15-minutes" },
                  { name: "Every 30 min", href: "/cron-every-30-minutes" },
                  { name: "Hourly", href: "/cron-every-hour" },
                  { name: "Daily", href: "/cron-every-day" },
                  { name: "Weekly", href: "/cron-every-week" },
                  { name: "Monthly", href: "/cron-every-month" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-full text-gray-400 hover:text-white transition-all"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Guides */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Platform Guides
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Node.js", href: "/cron-job-nodejs" },
                  { name: "Python", href: "/cron-job-python" },
                  { name: "Vercel", href: "/vercel-cron-jobs" },
                  { name: "Next.js", href: "/nextjs-cron-jobs" },
                  { name: "Docker", href: "/docker-cron-jobs" },
                  { name: "NPM", href: "/npm-cron-jobs" },
                  { name: "Ansible", href: "/ansible-cron-jobs" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-full text-gray-400 hover:text-white transition-all"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

