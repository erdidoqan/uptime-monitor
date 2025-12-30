import Link from 'next/link';
import { getRelatedIntervals, type IntervalData } from './interval-data';
import { Clock, ArrowRight } from 'lucide-react';

interface RelatedIntervalsProps {
  currentSlug: string;
}

export function RelatedIntervals({ currentSlug }: RelatedIntervalsProps) {
  const related = getRelatedIntervals(currentSlug, 6);

  if (related.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-6">
        Related Cron Schedules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {related.map((interval) => (
          <RelatedIntervalCard key={interval.slug} interval={interval} />
        ))}
      </div>
    </section>
  );
}

function RelatedIntervalCard({ interval }: { interval: IntervalData }) {
  return (
    <Link
      href={`/${interval.slug}`}
      className="group block p-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <Clock className="h-5 w-5 text-purple-400" />
        </div>
        <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
        {interval.title}
      </h3>
      <p className="text-sm text-gray-400 mb-2">
        {interval.humanReadable}
      </p>
      <code className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded font-mono">
        {interval.cronExpression}
      </code>
    </Link>
  );
}

