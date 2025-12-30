'use client';

import { useState, useEffect } from 'react';
import { Terminal, Clock, CheckCircle, XCircle, Info, Copy, Check } from 'lucide-react';
import { validateCronExpression, normalizeCronExpression } from '@/lib/cron-utils';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { CronExpressionParser } = require('cron-parser');

interface CronField {
  name: string;
  value: string;
  range: string;
  description: string;
}

export function CronExpressionTranslator() {
  const [cronExpr, setCronExpr] = useState('0 * * * *');
  const [humanReadable, setHumanReadable] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [error, setError] = useState('');
  const [nextRuns, setNextRuns] = useState<Date[]>([]);
  const [copied, setCopied] = useState(false);
  const [fields, setFields] = useState<CronField[]>([]);

  // Parse cron expression and generate human-readable description
  const parseCronExpression = (expr: string) => {
    const trimmed = expr.trim();
    
    // Reset state
    setError('');
    setIsValid(true);
    setFields([]);
    setNextRuns([]);

    // Basic validation
    if (!trimmed) {
      setIsValid(false);
      setError('Cron expression cannot be empty');
      setHumanReadable('');
      return;
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length !== 5) {
      setIsValid(false);
      setError('Cron expression must have exactly 5 fields (minute hour day month weekday)');
      setHumanReadable('');
      return;
    }

    // Validate with cron-parser
    if (!validateCronExpression(trimmed)) {
      setIsValid(false);
      setError('Invalid cron expression format');
      setHumanReadable('');
      return;
    }

    try {
      const normalized = normalizeCronExpression(trimmed);
      const cron = CronExpressionParser.parse(normalized, {
        currentDate: new Date(),
        tz: 'UTC',
      });

      // Generate human-readable description
      const description = generateHumanReadable(parts);
      setHumanReadable(description);

      // Parse fields
      const parsedFields = parseFields(parts);
      setFields(parsedFields);

      // Calculate next 5 run times
      const runs: Date[] = [];
      for (let i = 0; i < 5; i++) {
        const next = cron.next();
        runs.push(next.toDate());
      }
      setNextRuns(runs);

      setIsValid(true);
    } catch (err) {
      setIsValid(false);
      setError(err instanceof Error ? err.message : 'Failed to parse cron expression');
      setHumanReadable('');
    }
  };

  // Generate human-readable description
  const generateHumanReadable = (parts: string[]): string => {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const isEvery = (field: string) => field === '*';
    const isStep = (field: string) => field.startsWith('*/');
    const getStep = (field: string) => parseInt(field.replace('*/', ''), 10);
    const isSpecific = (field: string) => /^\d+$/.test(field);
    const getSpecific = (field: string) => parseInt(field, 10);
    const isRange = (field: string) => /^\d+-\d+$/.test(field);
    const isList = (field: string) => /^\d+(,\d+)+$/.test(field);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Every minute
    if (isEvery(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      return 'Every minute';
    }

    // Every N minutes
    if (isStep(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      const n = getStep(minute);
      return n === 1 ? 'Every minute' : `Every ${n} minutes`;
    }

    // Every hour at specific minute
    if (isSpecific(minute) && isEvery(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      const m = getSpecific(minute);
      return m === 0 ? 'Every hour' : `Every hour at minute ${m}`;
    }

    // Every N hours
    if (isSpecific(minute) && isStep(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      const m = getSpecific(minute);
      const n = getStep(hour);
      const timeStr = m === 0 ? '' : ` at minute ${m}`;
      return n === 1 ? `Every hour${timeStr}` : `Every ${n} hours${timeStr}`;
    }

    // Daily at specific time
    if (isSpecific(minute) && isSpecific(hour) && isEvery(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      const h = getSpecific(hour);
      const m = getSpecific(minute);
      return `Daily at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    // Weekly on specific day
    if (isSpecific(minute) && isSpecific(hour) && isEvery(dayOfMonth) && isEvery(month) && isSpecific(dayOfWeek)) {
      const h = getSpecific(hour);
      const m = getSpecific(minute);
      const d = getSpecific(dayOfWeek);
      const dayName = dayNames[d] || `Day ${d}`;
      return `Every ${dayName} at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    // Monthly on specific day
    if (isSpecific(minute) && isSpecific(hour) && isSpecific(dayOfMonth) && isEvery(month) && isEvery(dayOfWeek)) {
      const h = getSpecific(hour);
      const m = getSpecific(minute);
      const d = getSpecific(dayOfMonth);
      const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
      return `Monthly on the ${d}${suffix} at ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    // Complex expressions - return a more detailed description
    return 'Complex schedule (see breakdown below)';
  };

  // Parse individual fields
  const parseFields = (parts: string[]): CronField[] => {
    const fieldNames = [
      { name: 'Minute', range: '0-59' },
      { name: 'Hour', range: '0-23' },
      { name: 'Day of Month', range: '1-31' },
      { name: 'Month', range: '1-12' },
      { name: 'Day of Week', range: '0-7 (0 or 7 = Sunday)' },
    ];

    return parts.map((value, index) => {
      const fieldInfo = fieldNames[index];
      let description = '';

      if (value === '*') {
        description = 'Every value';
      } else if (value.startsWith('*/')) {
        const step = value.replace('*/', '');
        description = `Every ${step} ${fieldInfo.name.toLowerCase()}`;
      } else if (/^\d+-\d+$/.test(value)) {
        description = `Range: ${value}`;
      } else if (/^\d+(,\d+)+$/.test(value)) {
        description = `List: ${value}`;
      } else if (/^\d+$/.test(value)) {
        description = `Specific: ${value}`;
      } else {
        description = value;
      }

      return {
        name: fieldInfo.name,
        value,
        range: fieldInfo.range,
        description,
      };
    });
  };

  // Handle input change
  useEffect(() => {
    parseCronExpression(cronExpr);
  }, [cronExpr]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    }).format(date);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cronExpr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Example cron expressions
  const examples = [
    { expr: '0 * * * *', desc: 'Every hour' },
    { expr: '*/5 * * * *', desc: 'Every 5 minutes' },
    { expr: '0 0 * * *', desc: 'Daily at midnight' },
    { expr: '0 9 * * 1', desc: 'Every Monday at 9 AM' },
    { expr: '0 0 1 * *', desc: 'Monthly on the 1st' },
  ];

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <section className="rounded-xl bg-[#1a1a1d] border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/10">
          <Terminal className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-400">Cron Expression</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={cronExpr}
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="0 * * * *"
              className="flex-1 px-4 py-3 bg-[#0a0a0b] border border-white/10 rounded-lg text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>

          {/* Validation Status */}
          {isValid ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Valid cron expression</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <span className="text-sm">{error || 'Invalid cron expression'}</span>
            </div>
          )}

          {/* Human Readable Output */}
          {isValid && humanReadable && (
            <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">Human Readable</span>
              </div>
              <p className="text-xl font-semibold text-white">{humanReadable}</p>
            </div>
          )}
        </div>
      </section>

      {/* Examples */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-4">Example Expressions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {examples.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCronExpr(example.expr)}
              className="text-left p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-colors"
            >
              <code className="text-purple-400 font-mono text-sm block mb-1">{example.expr}</code>
              <p className="text-gray-400 text-sm">{example.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Field Breakdown */}
      {isValid && fields.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Field Breakdown</h2>
          <div className="rounded-xl bg-[#1a1a1d] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Field</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Range</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-400">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr key={index} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-white font-medium">{field.name}</td>
                      <td className="px-4 py-3">
                        <code className="text-purple-400 font-mono">{field.value}</code>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{field.range}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{field.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Next Run Times */}
      {isValid && nextRuns.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Next Run Times
          </h2>
          <div className="rounded-xl bg-[#1a1a1d] border border-white/10 overflow-hidden">
            <div className="p-6 space-y-3">
              {nextRuns.map((date, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white font-medium">{formatDate(date)}</p>
                      <p className="text-gray-400 text-sm">
                        {(() => {
                          const now = new Date();
                          const diff = date.getTime() - now.getTime();
                          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                          
                          if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
                          if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`;
                          return `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Help Section */}
      <section className="rounded-xl bg-[#1a1a1d] border border-white/10 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Cron Expression Format</h2>
        <div className="space-y-4 text-gray-300">
          <p className="text-sm">
            A cron expression consists of 5 fields separated by spaces:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            {[
              { field: 'Minute', range: '0-59', example: '0, 15, 30, 45' },
              { field: 'Hour', range: '0-23', example: '0, 12' },
              { field: 'Day of Month', range: '1-31', example: '1, 15' },
              { field: 'Month', range: '1-12', example: '1-6' },
              { field: 'Day of Week', range: '0-7', example: '0-4' },
            ].map((info, index) => (
              <div key={index} className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="font-semibold text-white text-sm mb-1">{info.field}</p>
                <p className="text-xs text-gray-400 mb-2">{info.range}</p>
                <p className="text-xs text-gray-500">{info.example}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <p><strong className="text-white">Special Characters:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
              <li><code className="text-purple-400">*</code> - Matches any value</li>
              <li><code className="text-purple-400">*/n</code> - Every n units (e.g., */5 = every 5 minutes)</li>
              <li><code className="text-purple-400">a-b</code> - Range (e.g., 1-5 = 1 through 5)</li>
              <li><code className="text-purple-400">a,b,c</code> - List (e.g., 1,3,5 = 1, 3, or 5)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

