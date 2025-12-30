import { PageHeader } from '@/components/static';
import { CronIntervalForm } from './cron-interval-form';
import { RelatedIntervals } from './related-intervals';
import { IntervalFAQ } from './interval-faq';
import { type IntervalData } from './interval-data';
import { Clock, Terminal, Zap, CheckCircle } from 'lucide-react';

interface CronIntervalPageProps {
  data: IntervalData;
}

export function CronIntervalPage({ data }: CronIntervalPageProps) {
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
            {/* Cron Expression Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                Cron Expression
              </h2>
              <div className="rounded-xl bg-[#1a1a1d] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
                  <Terminal className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-400">crontab syntax</span>
                </div>
                <div className="p-6">
                  <code className="text-2xl md:text-3xl font-mono text-purple-400">
                    {data.cronExpression}
                  </code>
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    {['minute', 'hour', 'day (month)', 'month', 'day (week)'].map((field, i) => (
                      <div key={field}>
                        <div className="font-mono text-lg text-white mb-1">
                          {data.cronExpression.split(' ')[i]}
                        </div>
                        <div className="text-gray-500">{field}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-gray-400 text-sm">
                This expression runs <strong className="text-white">{data.humanReadable}</strong>.{' '}
                {data.intervalSec < 3600 
                  ? `That's ${Math.round(3600 / data.intervalSec)} times per hour or ${Math.round(86400 / data.intervalSec)} times per day.`
                  : data.intervalSec < 86400
                    ? `That's ${Math.round(86400 / data.intervalSec)} times per day.`
                    : data.intervalSec === 86400
                      ? "That's once per day."
                      : data.intervalSec === 604800
                        ? "That's once per week."
                        : "That's once per month."
                }
              </p>
            </section>

            {/* Use Cases Section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                Common Use Cases
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10"
                  >
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-gray-300">{useCase}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works section */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                How It Works
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-semibold shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Enter your endpoint URL</h3>
                    <p className="text-gray-400 text-sm">
                      Paste your webhook URL, API endpoint, or any HTTP(S) address you want to call.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Test your request</h3>
                    <p className="text-gray-400 text-sm">
                      We'll send a test request to verify your endpoint responds correctly.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Create your cron job</h3>
                    <p className="text-gray-400 text-sm">
                      We'll call your endpoint {data.humanReadable} automatically. No server required.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">
                Why Use CronUptime?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Zap className="h-6 w-6 text-yellow-500 mb-2" />
                  <h3 className="font-semibold text-white mb-1">No Server Required</h3>
                  <p className="text-sm text-gray-400">
                    Schedule cron jobs without managing infrastructure. We handle execution at the edge.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <Clock className="h-6 w-6 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Reliable Timing</h3>
                  <p className="text-sm text-gray-400">
                    Built on Cloudflare Workers for 99.9%+ uptime. Your jobs run on time, every time.
                  </p>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <IntervalFAQ 
              faq={data.faq} 
              cronExpression={data.cronExpression}
              humanReadable={data.humanReadable}
            />
          </div>

          {/* Right column - Form */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <CronIntervalForm
                defaultInterval={data.intervalSec}
                isGuestAllowed={data.isGuestAllowed}
                humanReadable={data.humanReadable}
              />
            </div>
          </div>
        </div>

        {/* Related intervals */}
        <RelatedIntervals currentSlug={data.slug} />
      </div>
    </>
  );
}

