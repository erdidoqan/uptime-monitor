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
  type LoadTestReportData,
  type RampStepResult,
  isStepValid,
  getAnalysisMessages,
  labelForReason,
  regionLabel,
  formatDuration,
  percentile,
} from "./load-test-helpers";
import { WORKER_CONCURRENT } from "@/lib/load-test-limits";
import type { SeoInfo } from "@/lib/load-test-analyze";

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

/* ───────── Simple Markdown Renderer ───────── */

/** Inline markdown: **bold** ve *italic* */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>,
      );
    } else if (match[3]) {
      parts.push(
        <em key={match.index} className="italic text-gray-200">
          {match[3]}
        </em>,
      );
    }
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : text;
}

/** Hafif markdown renderer: **bold**, *italic*, satır sonları, başlıklar ve listeler */
function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, li) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={li} className="h-1" />;

        const h2Match = trimmed.match(/^##\s+(.+)/);
        if (h2Match) {
          return (
            <h3 key={li} className="text-sm font-semibold text-white mt-3 mb-1">
              {renderInline(h2Match[1])}
            </h3>
          );
        }

        const listMatch = trimmed.match(/^[-*]\s+(.+)/);
        if (listMatch) {
          return (
            <div key={li} className="flex gap-2 pl-1">
              <span className="text-violet-400/60 mt-0.5">•</span>
              <span>{renderInline(listMatch[1])}</span>
            </div>
          );
        }

        const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        if (olMatch) {
          return (
            <div key={li} className="flex gap-2 pl-1">
              <span className="text-violet-400/60 tabular-nums min-w-[1.2em] text-right mt-0.5">
                {olMatch[1]}.
              </span>
              <span>{renderInline(olMatch[2])}</span>
            </div>
          );
        }

        return <p key={li}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

/* ───────── Props ───────── */

interface LoadTestReportProps {
  report: LoadTestReportData;
  aiAnalysis?: string | null;
  aiAnalysisLoading?: boolean;
  /** true ise detaylı bölümler kilitli gösterilir (Pro paywall) */
  isLocked?: boolean;
  /** SEO sağlık bilgisi */
  seoInfo?: SeoInfo | null;
}

/* ───────── Component ───────── */

export function LoadTestReport({
  report,
  aiAnalysis,
  aiAnalysisLoading,
  isLocked = false,
  seoInfo,
}: LoadTestReportProps) {
  /* ── Chart data ── */
  const chartData = report.rampSteps.map((s) => ({
    concurrentUsers: s.concurrentUsers,
    p95: isStepValid(s) ? s.p95 : null,
    errorPct: Math.round(s.errorRate * 100),
  }));

  /* Hedef vs gerçek fark büyükse uyarı */
  const concurrencyGap = (() => {
    const lastStep = report.rampSteps[report.rampSteps.length - 1];
    if (!lastStep) return null;
    const ratio = lastStep.actualConcurrency / lastStep.concurrentUsers;
    if (ratio < 0.5) return lastStep;
    return null;
  })();

  const analysisMessages = getAnalysisMessages(report.rampSteps);

  /* Genel gecikme: canlı latencies varsa onlardan, yoksa DB p50/p95/p99'dan */
  const hasLiveLatencies = report.latencies && report.latencies.length > 0;
  const sortedLatencies = hasLiveLatencies
    ? [...report.latencies!].sort((a, b) => a - b)
    : null;

  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/10">
      {/* ── Durma bilgisi ── */}
      {(report.stoppedReason === "smart_stop" || report.stoppedReason === "user") && (
        <div className="flex gap-2 flex-wrap mb-4">
          {report.stoppedReason === "smart_stop" && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              Ardışık yüksek hata — test otomatik durduruldu
            </span>
          )}
          {report.stoppedReason === "user" && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
              Test kullanıcı tarafından durduruldu
            </span>
          )}
        </div>
      )}

      {/* ── Concurrency uyarısı ── */}
      {concurrencyGap && (
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm">
          <p className="font-medium mb-1">Hedef eşzamanlılığa ulaşılamadı</p>
          <p className="text-blue-200/80">
            {concurrencyGap.concurrentUsers} hedeflenip {concurrencyGap.actualConcurrency} gerçek eşzamanlı bağlantı elde edildi.
            İstek sayısı yetersiz — daha yüksek eşzamanlılık için toplam istek sayısını artırın
            (en az {Math.ceil(concurrencyGap.concurrentUsers / WORKER_CONCURRENT) * WORKER_CONCURRENT * report.rampSteps.length} istek önerilir).
          </p>
        </div>
      )}

      {/* ── Analiz mesajları ── */}
      {analysisMessages.length > 0 && (
        <div className="mb-4 space-y-2">
          {analysisMessages.map((rawMsg, i) => {
            const prefixMatch = rawMsg.match(/^(✅|⚠️|🔴|🔵|🟠|📊|💡) /);
            const prefix = prefixMatch ? prefixMatch[1] : "";
            const msg = prefixMatch ? rawMsg.slice(prefixMatch[0].length) : rawMsg;
            const isDanger = prefix === "🔴";
            const isInfo = prefix === "🔵" || prefix === "📊" || prefix === "💡";
            const isWarning = prefix === "⚠️" || prefix === "🟠";
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

      {/* ── Genel istatistikler ── */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-gray-400">Toplam istek</dt>
          <dd className="text-white font-medium">{report.totalSent.toLocaleString("tr-TR")}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Başarılı</dt>
          <dd className="text-emerald-400">{report.totalOk.toLocaleString("tr-TR")}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Hata</dt>
          <dd className="text-red-400">{report.totalErrors.toLocaleString("tr-TR")}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Süre</dt>
          <dd className="text-white">{formatDuration(report.durationSec)}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Ortalama RPS</dt>
          <dd className="text-white">{report.rps}</dd>
        </div>
        <div>
          <dt className="text-gray-400">Hedef eşzamanlı</dt>
          <dd className="text-white">{report.targetConcurrentUsers}</dd>
        </div>
      </dl>

      {/* ── Bölgeler ── */}
      {report.regions && report.regions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Bölgeler:</span>
          {report.regions.map((r) => (
            <span
              key={r}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20"
            >
              {regionLabel(r)}
            </span>
          ))}
        </div>
      )}

      {/* ── KİLİTLİ BÖLÜM: Grafik + Tablo + Gecikme + Hata + AI ── */}
      <div className="relative mt-6">
        {isLocked && <ProLockOverlay message="Performans grafiği, detaylı adım tablosu, AI analizi ve daha fazlası için Pro planına geçin" />}
        <div className={isLocked ? "blur-[6px] select-none pointer-events-none" : ""}>

          {/* ── Grafik: Eşzamanlı Kullanıcı vs Gecikme + Hata Oranı ── */}
          {chartData && chartData.length > 1 && (
            <div className="pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Eşzamanlı kullanıcı arttıkça performans
              </h4>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 5, right: 40, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="concurrentUsers"
                      type="number"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}`}
                      domain={["dataMin", "dataMax"]}
                      label={{
                        value: "Eşzamanlı kullanıcı",
                        position: "insideBottom",
                        offset: -2,
                        fill: "rgba(255,255,255,0.4)",
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}`}
                      label={{
                        value: "p95 (ms)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "rgba(255,255,255,0.4)",
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${v}%`}
                      domain={[0, "auto"]}
                      label={{
                        value: "Hata %",
                        angle: 90,
                        position: "insideRight",
                        fill: "rgba(255,255,255,0.4)",
                        fontSize: 10,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(10,10,11,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "p95") return [`${value} ms`, "Gecikme (p95)"];
                        return [`${value}%`, "Hata oranı"];
                      }}
                      labelFormatter={(label) => `${label} eşzamanlı kullanıcı`}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="p95"
                      name="p95"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#a78bfa" }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="errorPct"
                      name="errorPct"
                      stroke="#f87171"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: "#f87171" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#a78bfa] inline-block rounded" />
                  p95 gecikme (ms)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#f87171] inline-block rounded border-dashed" />
                  Hata oranı (%)
                </span>
              </div>
            </div>
          )}

          {/* ── Adım tablosu ── */}
          {report.rampSteps.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Ramp adımları
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="py-2 pr-3 font-medium">Eşz.</th>
                      <th className="py-2 pr-3 font-medium">İstek</th>
                      <th className="py-2 pr-3 font-medium">Süre</th>
                      <th className="py-2 pr-3 font-medium">Durum</th>
                      <th className="py-2 pr-3 font-medium">OK</th>
                      <th className="py-2 pr-3 font-medium">Hata</th>
                      <th className="py-2 pr-3 font-medium">Hata %</th>
                      <th className="py-2 pr-3 font-medium">RPS</th>
                      <th className="py-2 pr-3 font-medium">p50</th>
                      <th className="py-2 pr-3 font-medium">p95</th>
                      <th className="py-2 font-medium">p99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rampSteps.map((s, i) => {
                      const isHighError = s.errorRate >= 0.5;
                      const isMedError = s.errorRate >= 0.1;
                      const isHighLatency = s.p95 >= 5000;
                      const isMedLatency = s.p95 >= 2000;

                      let statusMsg = "";
                      let statusClass = "text-emerald-400/80";
                      if (isHighError) {
                        statusMsg = "Sunucu çöküyor";
                        statusClass = "text-red-400";
                      } else if (isMedError) {
                        statusMsg = "Hatalar artıyor";
                        statusClass = "text-red-400/80";
                      } else if (isHighLatency) {
                        statusMsg = "Çok yavaş";
                        statusClass = "text-red-400/80";
                      } else if (isMedLatency) {
                        statusMsg = "Yavaşlıyor";
                        statusClass = "text-amber-400";
                      } else if (s.ok > 0 && s.p95 >= 1000) {
                        statusMsg = "Kabul edilebilir";
                        statusClass = "text-amber-400/70";
                      } else if (s.ok > 0) {
                        statusMsg = "Sorunsuz";
                        statusClass = "text-emerald-400/80";
                      }

                      return (
                        <tr
                          key={i}
                          className={`border-b border-white/5 ${
                            isHighError
                              ? "text-red-300/90"
                              : isMedError || isMedLatency
                                ? "text-amber-200/90"
                                : "text-white/80"
                          }`}
                        >
                          <td className="py-1.5 pr-3 font-medium">
                            {s.concurrentUsers}
                          </td>
                          <td className="py-1.5 pr-3">{s.sent}</td>
                          <td className="py-1.5 pr-3 text-gray-400">{formatDuration(s.durationSec)}</td>
                          <td className={`py-1.5 pr-3 text-[11px] font-medium whitespace-nowrap ${statusClass}`}>
                            {statusMsg}
                          </td>
                          <td className="py-1.5 pr-3">{s.ok}</td>
                          <td className="py-1.5 pr-3">{s.errors}</td>
                          <td className="py-1.5 pr-3">
                            {Math.round(s.errorRate * 100)}%
                          </td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? s.rps : "—"}</td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? `${s.p50}ms` : "—"}</td>
                          <td className="py-1.5 pr-3">{s.ok > 0 ? `${s.p95}ms` : "—"}</td>
                          <td className="py-1.5">{s.ok > 0 ? `${s.p99}ms` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Genel gecikme istatistikleri ── */}
          {(sortedLatencies || (report.p50 != null && report.p95 != null)) && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="text-sm font-medium text-gray-400 mb-2">
                Genel gecikme (ms)
              </h4>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {sortedLatencies ? (
                  <>
                    <div>
                      <dt className="text-gray-500">Min</dt>
                      <dd className="text-white">{sortedLatencies[0]}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Ortalama</dt>
                      <dd className="text-white">
                        {Math.round(
                          sortedLatencies.reduce((a, b) => a + b, 0) /
                            sortedLatencies.length,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">p95</dt>
                      <dd className="text-white">
                        {Math.round(percentile(sortedLatencies, 95))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">p99</dt>
                      <dd className="text-white">
                        {Math.round(percentile(sortedLatencies, 99))}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt className="text-gray-500">p50</dt>
                      <dd className="text-white">{report.p50 ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">p95</dt>
                      <dd className="text-white">{report.p95 ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">p99</dt>
                      <dd className="text-white">{report.p99 ?? "—"}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          )}

          {/* ── Hata nedenleri ── */}
          {report.errorReasons &&
            Object.keys(report.errorReasons).length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Hata nedenleri
                </h4>
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(report.errorReasons)
                    .sort((a, b) => b[1] - a[1])
                    .map(([reason, count]) => (
                      <li
                        key={reason}
                        className="flex justify-between text-red-300/90"
                      >
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
              <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg
                    className="h-4 w-4 text-violet-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                    />
                  </svg>
                  <h4 className="text-sm font-semibold text-violet-300">
                    AI Yorumu
                  </h4>
                </div>

                {aiAnalysisLoading ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-violet-300/70">
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      AI verilerinizi yorumluyor...
                    </div>
                    <div className="space-y-2 animate-pulse">
                      <div className="h-3 bg-violet-500/15 rounded w-full" />
                      <div className="h-3 bg-violet-500/15 rounded w-5/6" />
                      <div className="h-3 bg-violet-500/15 rounded w-4/6" />
                      <div className="h-3 bg-violet-500/15 rounded w-3/4" />
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

          {/* ── SEO Sağlığı ── */}
          {seoInfo && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className={`rounded-xl border p-4 ${
                seoInfo.hasSitemap
                  ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent"
                  : "border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <svg className={`h-4 w-4 ${seoInfo.hasSitemap ? "text-emerald-400" : "text-orange-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  <h4 className={`text-sm font-semibold ${seoInfo.hasSitemap ? "text-emerald-300" : "text-orange-300"}`}>
                    SEO Sağlığı
                  </h4>
                </div>

                <div className="space-y-2.5 text-sm">
                  {/* Sitemap durumu */}
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">{seoInfo.hasSitemap ? "✅" : "❌"}</span>
                    <div>
                      <span className={seoInfo.hasSitemap ? "text-emerald-200" : "text-orange-200"}>
                        {seoInfo.hasSitemap
                          ? `Sitemap mevcut${seoInfo.sitemapUrlCount ? ` — ${seoInfo.sitemapUrlCount.toLocaleString("tr-TR")} sayfa tespit edildi` : ""}`
                          : "Sitemap.xml bulunamadı"}
                      </span>
                      {seoInfo.hasSitemap && seoInfo.sitemapUrl && (
                        <p className="text-xs text-gray-500 mt-0.5 break-all">{seoInfo.sitemapUrl}</p>
                      )}
                      {!seoInfo.hasSitemap && (
                        <p className="text-xs text-orange-300/60 mt-0.5">
                          Google sayfalarınızı tam olarak keşfedemiyor olabilir. Bir sitemap.xml oluşturmanız önerilir.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* robots.txt durumu */}
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">{seoInfo.hasRobotsTxt ? "✅" : "❌"}</span>
                    <div>
                      <span className={seoInfo.hasRobotsTxt ? "text-emerald-200" : "text-orange-200"}>
                        {seoInfo.hasRobotsTxt ? "robots.txt mevcut" : "robots.txt bulunamadı"}
                      </span>
                      {seoInfo.hasRobotsTxt && seoInfo.robotsAllowsCrawl === false && (
                        <p className="text-xs text-red-400 mt-0.5">
                          ⚠️ robots.txt Googlebot erişimini engelliyor! Sayfalarınız indekslenemez.
                        </p>
                      )}
                      {seoInfo.hasRobotsTxt && seoInfo.robotsAllowsCrawl === true && (
                        <p className="text-xs text-emerald-300/60 mt-0.5">Googlebot erişimine izin veriliyor</p>
                      )}
                    </div>
                  </div>

                  {/* CMS tespiti */}
                  {seoInfo.cms && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">🔧</span>
                      <span className="text-gray-300">Platform: <span className="text-white font-medium">{seoInfo.cms}</span></span>
                    </div>
                  )}

                  {/* Google crawl karşılaştırması */}
                  {seoInfo.hasSitemap && seoInfo.sitemapUrlCount && seoInfo.sitemapUrlCount > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 leading-relaxed">
                      <span className="text-gray-300 font-medium">Google Crawl Karşılaştırması:</span>{" "}
                      Bu sitede {seoInfo.sitemapUrlCount.toLocaleString("tr-TR")} sayfa var.
                      Google ortalama <span className="text-white">500–2.000 istek/gün</span> atar.
                      {report.targetConcurrentUsers && (
                        <> Siteniz <span className="text-white">{report.targetConcurrentUsers} eşzamanlı kullanıcıyı</span> karşıladıysa,
                        Google crawl&apos;u rahatlıkla kaldırabilir.</>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
