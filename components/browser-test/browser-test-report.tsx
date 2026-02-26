"use client";

import React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  type BrowserTestReportData,
  type BrowserTestStepResult,
  getVitalScore,
  vitalScoreLabel,
  vitalScoreColor,
  vitalScoreBg,
  getWebVitalsAnalysisMessages,
  labelForReason,
  formatMs,
  formatBytes,
  formatDuration,
  formatCls,
} from "./browser-test-helpers";

/* ───────── Polar Checkout ───────── */

const POLAR_CHECKOUT_URL =
  "https://buy.polar.sh/polar_cl_pbGzjD0Vi4y7yngJdFz03qka4EnPzE5JalPGR0mqJ8o";

async function openPolarCheckout() {
  try {
    const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");
    await PolarEmbedCheckout.create(POLAR_CHECKOUT_URL, { theme: "dark" });
  } catch {
    window.open(POLAR_CHECKOUT_URL, "_blank");
  }
}

/* ───────── Pro Lock Overlay ───────── */

function ProLockOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-t from-[#0a0a0b]/95 via-[#0a0a0b]/80 to-[#0a0a0b]/60 rounded-lg backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 px-6 text-center max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/15 border border-purple-500/30">
          <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          {message || "Detaylı raporu görmek için Pro planına geçin"}
        </p>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); openPolarCheckout(); }}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm cursor-pointer hover:from-purple-600 hover:to-pink-600 transition-colors shadow-lg shadow-purple-500/25"
        >
          Pro Planına Geç — $5/ay
        </button>
      </div>
    </div>
  );
}

/* ───────── Simple Markdown ───────── */

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, li) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={li} className="h-1" />;
        return <p key={li}>{trimmed}</p>;
      })}
    </div>
  );
}

/* ───────── Web Vital Card ───────── */

function VitalCard({
  label,
  value,
  formatted,
  metric,
}: {
  label: string;
  value: number;
  formatted: string;
  metric: string;
}) {
  const score = getVitalScore(metric, value);
  return (
    <div className={`p-3 rounded-lg border ${vitalScoreBg(score)}`}>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className={`text-lg font-bold ${vitalScoreColor(score)}`}>{formatted}</dd>
      <span className={`text-[10px] font-medium ${vitalScoreColor(score)}`}>
        {vitalScoreLabel(score)}
      </span>
    </div>
  );
}

/* ───────── Props ───────── */

interface BrowserTestReportProps {
  report: BrowserTestReportData;
  aiAnalysis?: string | null;
  aiAnalysisLoading?: boolean;
  isLocked?: boolean;
}

/* ───────── Component ───────── */

export function BrowserTestReport({
  report,
  aiAnalysis,
  aiAnalysisLoading,
  isLocked = false,
}: BrowserTestReportProps) {
  const chartData = report.rampSteps
    .filter((s) => s.ok > 0)
    .map((s) => ({
      browsers: s.browsers,
      lcp: s.avgLcp,
      fcp: s.avgFcp,
      errorPct: Math.round(s.errorRate * 100),
    }));

  const analysisMessages = getWebVitalsAnalysisMessages(report.rampSteps);

  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/10">
      {/* ── Durma bilgisi ── */}
      {(report.stoppedReason === "smart_stop" || report.stoppedReason === "user") && (
        <div className="flex gap-2 flex-wrap mb-4">
          {report.stoppedReason === "smart_stop" && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              Ardışık yüksek hata — otomatik durduruldu
            </span>
          )}
          {report.stoppedReason === "user" && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              Kullanıcı tarafından durduruldu
            </span>
          )}
        </div>
      )}

      {/* ── Analiz mesajları ── */}
      {analysisMessages.length > 0 && (
        <div className="mb-4 space-y-2">
          {analysisMessages.map((rawMsg, i) => {
            const prefixMatch = rawMsg.match(/^(✅|⚠️|🔴|🔵|📊|💡) /);
            const prefix = prefixMatch ? prefixMatch[1] : "";
            const msg = prefixMatch ? rawMsg.slice(prefixMatch[0].length) : rawMsg;
            const isDanger = prefix === "🔴";
            const isInfo = prefix === "🔵" || prefix === "📊" || prefix === "💡";
            const isWarning = prefix === "⚠️";
            const isGood = prefix === "✅";
            return (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm leading-relaxed ${
                  isDanger
                    ? "bg-red-500/10 border border-red-500/30 text-red-300"
                    : isInfo
                      ? "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                      : isWarning
                        ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
                        : isGood
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                          : "bg-white/5 border border-white/10 text-gray-300"
                }`}
              >
                {prefix && <span className="mr-1.5">{prefix}</span>}
                {msg}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Web Vitals Cards ── */}
      {report.avgLcp != null && report.avgFcp != null && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <VitalCard label="LCP" value={report.avgLcp} formatted={formatMs(report.avgLcp)} metric="lcp" />
          <VitalCard label="FCP" value={report.avgFcp} formatted={formatMs(report.avgFcp)} metric="fcp" />
          <VitalCard label="TTFB" value={report.avgTtfb ?? 0} formatted={formatMs(report.avgTtfb ?? 0)} metric="ttfb" />
          <VitalCard label="CLS" value={report.avgCls ?? 0} formatted={formatCls(report.avgCls ?? 0)} metric="cls" />
        </dl>
      )}

      {/* ── Genel istatistikler ── */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-gray-400">Toplam ziyaret</dt>
          <dd className="text-white font-medium">{report.totalVisits}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Başarılı</dt>
          <dd className="text-emerald-400">{report.totalOk}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Hata</dt>
          <dd className="text-red-400">{report.totalErrors}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Süre</dt>
          <dd className="text-white">{formatDuration(report.durationSec)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Hedef kullanıcı</dt>
          <dd className="text-white">{report.targetBrowsers}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Sayfa/kullanıcı</dt>
          <dd className="text-white">{report.tabsPerBrowser}</dd>
        </div>
      </dl>

      {/* ── Kaynak özeti ── */}
      {report.totalResources != null && report.totalResources > 0 && (
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <span>Ortalama kaynak: <span className="text-white">{report.totalResources}</span></span>
          <span>Boyut: <span className="text-white">{formatBytes(report.totalBytes ?? 0)}</span></span>
          {report.jsErrors > 0 && (
            <span>JS hata: <span className="text-red-400">{report.jsErrors}</span></span>
          )}
        </div>
      )}

      {/* ── KİLİTLİ BÖLÜM ── */}
      <div className="relative mt-6">
        {isLocked && <ProLockOverlay message="Web Vitals grafiği, detaylı adım tablosu, AI analizi ve daha fazlası için Pro planına geçin" />}
        <div className={isLocked ? "blur-[6px] select-none pointer-events-none" : ""}>

          {/* ── Grafik: Browser vs LCP + FCP + Hata ── */}
          {chartData.length > 1 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Kullanıcı sayısı arttıkça performans
              </h4>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="browsers"
                      type="number"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      domain={["dataMin", "dataMax"]}
                      label={{ value: "Kullanıcı", position: "insideBottom", offset: -2, fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}`}
                      label={{ value: "ms", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}%`}
                      domain={[0, "auto"]}
                      label={{ value: "Hata %", angle: 90, position: "insideRight", fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(10,10,11,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
                      formatter={(value: number, name: string) => {
                        if (name === "lcp") return [`${value} ms`, "LCP"];
                        if (name === "fcp") return [`${value} ms`, "FCP"];
                        return [`${value}%`, "Hata oranı"];
                      }}
                      labelFormatter={(label) => `${label} kullanıcı`}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="lcp" name="lcp" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3, fill: "#22d3ee" }} />
                    <Line yAxisId="left" type="monotone" dataKey="fcp" name="fcp" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: "#a78bfa" }} />
                    <Line yAxisId="right" type="monotone" dataKey="errorPct" name="errorPct" stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: "#f87171" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#22d3ee] inline-block rounded" />
                  LCP (ms)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#a78bfa] inline-block rounded" />
                  FCP (ms)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#f87171] inline-block rounded" />
                  Hata (%)
                </span>
              </div>
            </div>
          )}

          {/* ── Adım tablosu ── */}
          {report.rampSteps.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Kullanıcı adımları</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="py-2 pr-3 font-medium">Kullanıcı</th>
                      <th className="py-2 pr-3 font-medium">Ziyaret</th>
                      <th className="py-2 pr-3 font-medium">Süre</th>
                      <th className="py-2 pr-3 font-medium">LCP</th>
                      <th className="py-2 pr-3 font-medium">FCP</th>
                      <th className="py-2 pr-3 font-medium">TTFB</th>
                      <th className="py-2 pr-3 font-medium">CLS</th>
                      <th className="py-2 pr-3 font-medium">Hata %</th>
                      <th className="py-2 font-medium">JS Hata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rampSteps.map((s: BrowserTestStepResult, i: number) => {
                      const lcpScore = s.ok > 0 ? getVitalScore("lcp", s.avgLcp) : null;
                      const isHighError = s.errorRate >= 0.5;
                      const isMedError = s.errorRate >= 0.1;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-white/5 ${
                            isHighError ? "text-red-300/90"
                              : isMedError ? "text-amber-200/90"
                                : "text-white/80"
                          }`}
                        >
                          <td className="py-1.5 pr-3 font-medium">{s.browsers}</td>
                          <td className="py-1.5 pr-3">{s.totalVisits}</td>
                          <td className="py-1.5 pr-3 text-gray-400">{formatDuration(s.durationSec)}</td>
                          <td className={`py-1.5 pr-3 ${lcpScore ? vitalScoreColor(lcpScore) : ""}`}>
                            {s.ok > 0 ? formatMs(s.avgLcp) : "—"}
                          </td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? formatMs(s.avgFcp) : "—"}</td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? formatMs(s.avgTtfb) : "—"}</td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? formatCls(s.avgCls) : "—"}</td>
                          <td className="py-1.5 pr-3">{Math.round(s.errorRate * 100)}%</td>
                          <td className="py-1.5">{s.jsErrors > 0 ? s.jsErrors : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── p95 Web Vitals ── */}
          {report.p95Lcp != null && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-2">p95 Web Vitals</h4>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500">p95 LCP</dt>
                  <dd className="text-white">{formatMs(report.p95Lcp)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">p95 FCP</dt>
                  <dd className="text-white">{formatMs(report.p95Fcp ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">p95 TTFB</dt>
                  <dd className="text-white">{formatMs(report.p95Ttfb ?? 0)}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* ── Hata nedenleri ── */}
          {report.errorReasons && Object.keys(report.errorReasons).length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Hata nedenleri</h4>
              <ul className="space-y-1.5 text-sm">
                {Object.entries(report.errorReasons)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <li key={reason} className="flex justify-between text-red-300/90">
                      <span>{labelForReason(reason)}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* ── AI Yorumu ── */}
          {(aiAnalysisLoading || aiAnalysis) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-cyan-300">AI Yorumu</h4>
                </div>

                {aiAnalysisLoading ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-cyan-300/70">
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      AI verilerinizi yorumluyor...
                    </div>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 bg-cyan-500/15 rounded w-full" />
                      <div className="h-3 bg-cyan-500/15 rounded w-5/6" />
                      <div className="h-3 bg-cyan-500/15 rounded w-4/6" />
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="text-sm leading-relaxed text-gray-300/90">
                    <SimpleMarkdown text={aiAnalysis} />
                  </div>
                ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
