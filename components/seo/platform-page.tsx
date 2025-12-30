import Link from 'next/link';
import { PageHeader } from '@/components/static';
import { CronIntervalForm } from './cron-interval-form';
import { IntervalFAQ } from './interval-faq';
import { type PlatformData, getRelatedPlatforms } from './platform-data';
import { Terminal, CheckCircle, XCircle, ArrowRight, Zap, Clock, Server } from 'lucide-react';

interface PlatformPageProps {
  data: PlatformData;
}

export function PlatformPage({ data }: PlatformPageProps) {
  const relatedPlatforms = getRelatedPlatforms(data.slug);

  return (
    <>
      <PageHeader
        title={data.title}
        description={data.description}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16">
        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left column - Content */}
          <div className="lg:col-span-3 space-y-12">
            {/* Setup Steps */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                How to Set Up Cron Jobs in {data.platform}
              </h2>
              <div className="space-y-6">
                {data.setupSteps.map((step, index) => (
                  <div key={index} className="rounded-xl bg-[#1a1a1d] border border-white/10 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border-b border-white/10">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-sm font-semibold">
                        {index + 1}
                      </div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-400 text-sm mb-3">{step.description}</p>
                      {step.code && (
                        <div className="rounded-lg bg-black/50 border border-white/5 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/5">
                            <Terminal className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs text-gray-500">Code</span>
                          </div>
                          <pre className="p-4 text-sm text-gray-300 overflow-x-auto">
                            <code>{step.code}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Limitations vs CronUptime */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                {data.platform} Cron Limitations vs CronUptime
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Limitations */}
                <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-5">
                  <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    {data.platform} Limitations
                  </h3>
                  <ul className="space-y-2">
                    {data.limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="text-red-400 mt-1">•</span>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CronUptime Advantages */}
                <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-5">
                  <h3 className="font-semibold text-green-400 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    CronUptime Advantages
                  </h3>
                  <ul className="space-y-2">
                    {data.cronUptimeAdvantages.map((advantage, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                        <span className="text-green-400 mt-1">✓</span>
                        {advantage}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Why use CronUptime */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                Why Use CronUptime Instead?
              </h2>
              <p className="text-gray-400 mb-6">
                While {data.platform} cron jobs work for basic use cases, managing infrastructure for scheduled tasks 
                adds complexity. CronUptime offers a simpler, serverless alternative.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Zap className="h-6 w-6 text-yellow-500 mb-2" />
                  <h3 className="font-semibold text-white mb-1">No Infrastructure</h3>
                  <p className="text-sm text-gray-400">
                    We handle execution. No servers to maintain.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Clock className="h-6 w-6 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Reliable Timing</h3>
                  <p className="text-sm text-gray-400">
                    Built on Cloudflare for 99.9%+ uptime.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Server className="h-6 w-6 text-purple-500 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Any Endpoint</h3>
                  <p className="text-sm text-gray-400">
                    Works with any HTTP endpoint on any platform.
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <IntervalFAQ 
              faq={data.faq} 
              cronExpression="*/5 * * * *"
              humanReadable="every 5 minutes"
            />

            {/* Related Platforms */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">
                Cron Jobs on Other Platforms
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedPlatforms.map((platform) => (
                  <Link
                    key={platform.slug}
                    href={`/${platform.slug}`}
                    className="group flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all"
                  >
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {platform.title}
                      </h3>
                      <p className="text-sm text-gray-500">{platform.platform}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Right column - Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Try CronUptime Free
                </h3>
                <p className="text-sm text-gray-400">
                  Schedule HTTP requests without managing {data.platform} infrastructure.
                </p>
              </div>
              <CronIntervalForm
                defaultInterval={300}
                isGuestAllowed={true}
                humanReadable="every 5 minutes"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

