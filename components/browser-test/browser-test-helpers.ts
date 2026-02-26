/* ───────── Shared Types ───────── */

export interface BrowserTestStepResult {
  browsers: number;
  tabsPerBrowser: number;
  totalVisits: number;
  ok: number;
  errors: number;
  errorRate: number;
  durationSec: number;
  avgTtfb: number;
  avgFcp: number;
  avgLcp: number;
  /** CLS * 1000 olarak saklanır (0.1 → 100) */
  avgCls: number;
  p95Ttfb: number;
  p95Fcp: number;
  p95Lcp: number;
  avgDomComplete: number;
  avgPageLoad: number;
  totalResources: number;
  totalBytes: number;
  jsErrors: number;
  errorReasons?: Record<string, number>;
}

export interface BrowserTestReportData {
  totalVisits: number;
  totalOk: number;
  totalErrors: number;
  durationSec: number;
  targetBrowsers: number;
  tabsPerBrowser: number;
  avgTtfb: number | null;
  avgFcp: number | null;
  avgLcp: number | null;
  avgCls: number | null;
  p95Ttfb: number | null;
  p95Fcp: number | null;
  p95Lcp: number | null;
  avgDomComplete: number | null;
  avgPageLoad: number | null;
  totalResources: number | null;
  totalBytes: number | null;
  jsErrors: number;
  errorReasons?: Record<string, number> | null;
  rampSteps: BrowserTestStepResult[];
  stoppedReason?: string;
}

/* ───────── Web Vitals Scoring ───────── */

export type VitalScore = 'good' | 'needs-improvement' | 'poor';

export interface VitalThreshold {
  good: number;
  needsImprovement: number;
}

export const VITAL_THRESHOLDS: Record<string, VitalThreshold> = {
  lcp: { good: 2500, needsImprovement: 4000 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 },
  /** CLS is stored as score * 1000 */
  cls: { good: 100, needsImprovement: 250 },
};

export function getVitalScore(metric: string, value: number): VitalScore {
  const t = VITAL_THRESHOLDS[metric];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.needsImprovement) return 'needs-improvement';
  return 'poor';
}

export function vitalScoreLabel(score: VitalScore): string {
  switch (score) {
    case 'good': return 'İyi';
    case 'needs-improvement': return 'Geliştirmeli';
    case 'poor': return 'Kötü';
  }
}

export function vitalScoreColor(score: VitalScore): string {
  switch (score) {
    case 'good': return 'text-emerald-400';
    case 'needs-improvement': return 'text-amber-400';
    case 'poor': return 'text-red-400';
  }
}

export function vitalScoreBg(score: VitalScore): string {
  switch (score) {
    case 'good': return 'bg-emerald-500/10 border-emerald-500/30';
    case 'needs-improvement': return 'bg-amber-500/10 border-amber-500/30';
    case 'poor': return 'bg-red-500/10 border-red-500/30';
  }
}

/* ───────── Helpers ───────── */

export const ERROR_REASON_LABELS: Record<string, string> = {
  timeout: 'Zaman aşımı',
  navigation_error: 'Sayfa yüklenemedi',
  ssl_error: 'SSL/TLS hatası',
  connection_refused: 'Bağlantı reddedildi',
  dns_failed: 'DNS hatası',
  browser_crashed: 'Browser çöktü',
  browser_launch_failed: 'Browser başlatılamadı',
  rate_limit: 'Rate limit (429)',
  unknown_error: 'Bilinmeyen hata',
};

export function labelForReason(key: string): string {
  return ERROR_REASON_LABELS[key] ?? key.replace(/_/g, ' ');
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(sec: number): string {
  if (sec < 1) return `${Math.round(sec * 1000)}ms`;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  return `${Math.floor(sec / 60)}dk ${Math.round(sec % 60)}s`;
}

export function formatCls(clsTimesThousand: number): string {
  return (clsTimesThousand / 1000).toFixed(3);
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (i - lo) * (sorted[hi] - sorted[lo]);
}

export function mergeErrorReasons(
  sources: (Record<string, number> | undefined)[],
): Record<string, number> | undefined {
  const merged: Record<string, number> = {};
  for (const src of sources) {
    if (!src) continue;
    for (const [reason, count] of Object.entries(src)) {
      merged[reason] = (merged[reason] ?? 0) + count;
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/* ───────── Analysis Messages ───────── */

export function getWebVitalsAnalysisMessages(rampSteps: BrowserTestStepResult[]): string[] {
  if (rampSteps.length === 0) return [];
  const messages: string[] = [];

  const validSteps = rampSteps.filter((s) => s.ok > 0);
  if (validSteps.length === 0) {
    messages.push('🔴 Hiçbir adımda başarılı sayfa yüklemesi olmadı. URL veya sunucu durumunu kontrol edin.');
    return messages;
  }

  const firstStep = validSteps[0];
  const lastStep = validSteps[validSteps.length - 1];

  const lcpScore = getVitalScore('lcp', firstStep.avgLcp);
  const fcpScore = getVitalScore('fcp', firstStep.avgFcp);
  const ttfbScore = getVitalScore('ttfb', firstStep.avgTtfb);
  const clsScore = getVitalScore('cls', firstStep.avgCls);

  const goodCount = [lcpScore, fcpScore, ttfbScore, clsScore].filter((s) => s === 'good').length;
  const poorCount = [lcpScore, fcpScore, ttfbScore, clsScore].filter((s) => s === 'poor').length;

  if (goodCount === 4) {
    messages.push(`✅ Tüm Core Web Vitals metrikleri "İyi" seviyede (LCP: ${formatMs(firstStep.avgLcp)}, FCP: ${formatMs(firstStep.avgFcp)}, CLS: ${formatCls(firstStep.avgCls)})`);
  } else if (poorCount >= 2) {
    messages.push(`🔴 Core Web Vitals metrikleri kritik seviyede — ${poorCount} metrik "Kötü" (LCP: ${formatMs(firstStep.avgLcp)}, TTFB: ${formatMs(firstStep.avgTtfb)})`);
  } else {
    messages.push(`⚠️ Bazı Web Vitals metrikleri iyileştirme gerektiriyor (LCP: ${formatMs(firstStep.avgLcp)}, FCP: ${formatMs(firstStep.avgFcp)})`);
  }

  if (validSteps.length > 1) {
    const lcpIncrease = lastStep.avgLcp / Math.max(firstStep.avgLcp, 1);
    if (lcpIncrease > 2) {
      messages.push(
        `🔴 ${lastStep.browsers} kullanıcıda LCP ${lcpIncrease.toFixed(1)}x kötüleşti (${formatMs(firstStep.avgLcp)} → ${formatMs(lastStep.avgLcp)}) — yoğun trafikte ciddi performans düşüşü`
      );
    } else if (lcpIncrease > 1.5) {
      messages.push(
        `⚠️ ${lastStep.browsers} kullanıcıda LCP %${Math.round((lcpIncrease - 1) * 100)} arttı (${formatMs(firstStep.avgLcp)} → ${formatMs(lastStep.avgLcp)})`
      );
    } else {
      messages.push(
        `✅ ${lastStep.browsers} kullanıcıya kadar LCP stabil kaldı (${formatMs(firstStep.avgLcp)} → ${formatMs(lastStep.avgLcp)})`
      );
    }
  }

  const highErrorStep = rampSteps.find((s) => s.errorRate >= 0.3);
  if (highErrorStep) {
    messages.push(
      `🔴 ${highErrorStep.browsers} kullanıcıda %${Math.round(highErrorStep.errorRate * 100)} hata oranı — sunucu bu trafiği kaldıramıyor`
    );
  }

  const totalJsErrors = rampSteps.reduce((sum, s) => sum + s.jsErrors, 0);
  if (totalJsErrors > 0) {
    messages.push(`⚠️ Ziyaretler sırasında toplam ${totalJsErrors} JavaScript hatası tespit edildi`);
  }

  if (lastStep.totalResources > 0) {
    messages.push(
      `📊 Sayfa ortalama ${lastStep.totalResources} kaynak yüklüyor (${formatBytes(lastStep.totalBytes)})`
    );
  }

  return messages;
}
