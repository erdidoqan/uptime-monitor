import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getD1Client } from "@/lib/d1-client";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { getUserSubscription } from "@/lib/subscription";
import { BrowserTestDetailContent } from "./browser-test-detail-content";

/* ───────── Types ───────── */

interface BrowserTestDbRow {
  id: string;
  url: string;
  target_url: string;
  target_browsers: number;
  tabs_per_browser: number;
  total_visits: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  avg_ttfb: number | null;
  avg_fcp: number | null;
  avg_lcp: number | null;
  avg_cls: number | null;
  p95_ttfb: number | null;
  p95_fcp: number | null;
  p95_lcp: number | null;
  avg_dom_complete: number | null;
  avg_page_load: number | null;
  total_resources: number | null;
  total_bytes: number | null;
  js_errors: number;
  error_reasons: string | null;
  ramp_steps: string | null;
  stopped_reason: string | null;
  ai_analysis: string | null;
  status: string;
  created_at: number;
  updated_at: number | null;
}

export interface BrowserTestData {
  id: string;
  url: string;
  target_url: string;
  target_browsers: number;
  tabs_per_browser: number;
  total_visits: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  avg_ttfb: number | null;
  avg_fcp: number | null;
  avg_lcp: number | null;
  avg_cls: number | null;
  p95_ttfb: number | null;
  p95_fcp: number | null;
  p95_lcp: number | null;
  avg_dom_complete: number | null;
  avg_page_load: number | null;
  total_resources: number | null;
  total_bytes: number | null;
  js_errors: number;
  error_reasons: Record<string, number> | null;
  ramp_steps: Array<{
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
  }>;
  stopped_reason: string | null;
  ai_analysis: string | null;
  status: string;
  created_at: number;
}

/* ───────── Data Fetching ───────── */

async function getBrowserTest(id: string): Promise<BrowserTestData | null> {
  try {
    if (!id || id.length < 10) return null;

    const db = getD1Client();
    const row = await db.queryFirst<BrowserTestDbRow>(
      `SELECT * FROM browser_tests WHERE id = ?`,
      [id],
    );

    if (!row) return null;

    if (row.status === "running") {
      const STALE_THRESHOLD_MS = 10 * 60 * 1000;
      if (Date.now() - row.created_at > STALE_THRESHOLD_MS) {
        try {
          await db.execute(
            `UPDATE browser_tests SET status = 'abandoned', updated_at = ? WHERE id = ? AND status = 'running'`,
            [Date.now(), row.id],
          );
        } catch {}
        return {
          id: row.id,
          url: row.url,
          target_url: row.target_url || row.url,
          target_browsers: row.target_browsers,
          tabs_per_browser: row.tabs_per_browser,
          total_visits: 0, total_ok: 0, total_errors: 0, duration_sec: 0,
          avg_ttfb: null, avg_fcp: null, avg_lcp: null, avg_cls: null,
          p95_ttfb: null, p95_fcp: null, p95_lcp: null,
          avg_dom_complete: null, avg_page_load: null,
          total_resources: null, total_bytes: null, js_errors: 0,
          error_reasons: null, ramp_steps: [],
          stopped_reason: null, ai_analysis: null,
          status: "abandoned", created_at: row.created_at,
        };
      }

      return {
        id: row.id,
        url: row.url,
        target_url: row.target_url || row.url,
        target_browsers: row.target_browsers,
        tabs_per_browser: row.tabs_per_browser,
        total_visits: 0, total_ok: 0, total_errors: 0, duration_sec: 0,
        avg_ttfb: null, avg_fcp: null, avg_lcp: null, avg_cls: null,
        p95_ttfb: null, p95_fcp: null, p95_lcp: null,
        avg_dom_complete: null, avg_page_load: null,
        total_resources: null, total_bytes: null, js_errors: 0,
        error_reasons: null, ramp_steps: [],
        stopped_reason: null, ai_analysis: null,
        status: "running", created_at: row.created_at,
      };
    }

    return {
      id: row.id,
      url: row.url,
      target_url: row.target_url,
      target_browsers: row.target_browsers,
      tabs_per_browser: row.tabs_per_browser,
      total_visits: row.total_visits,
      total_ok: row.total_ok,
      total_errors: row.total_errors,
      duration_sec: row.duration_sec,
      avg_ttfb: row.avg_ttfb,
      avg_fcp: row.avg_fcp,
      avg_lcp: row.avg_lcp,
      avg_cls: row.avg_cls,
      p95_ttfb: row.p95_ttfb,
      p95_fcp: row.p95_fcp,
      p95_lcp: row.p95_lcp,
      avg_dom_complete: row.avg_dom_complete,
      avg_page_load: row.avg_page_load,
      total_resources: row.total_resources,
      total_bytes: row.total_bytes,
      js_errors: row.js_errors,
      error_reasons: row.error_reasons ? JSON.parse(row.error_reasons) : null,
      ramp_steps: row.ramp_steps ? JSON.parse(row.ramp_steps) : [],
      stopped_reason: row.stopped_reason,
      ai_analysis: row.ai_analysis,
      status: row.status,
      created_at: row.created_at,
    };
  } catch (err) {
    console.error("[browser-test-detail] DB error:", err);
    return null;
  }
}

/* ───────── Metadata ───────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const test = await getBrowserTest(id);

  if (!test) {
    return { title: "Rapor Bulunamadı - UptimeTR" };
  }

  const urlDisplay = test.target_url || test.url;

  return {
    title: `Trafik Raporu - ${urlDisplay} | UptimeTR`,
    description: `${urlDisplay} için trafik raporu: ${test.total_visits} ziyaret, ${test.target_browsers} kullanıcı, LCP: ${test.avg_lcp ? test.avg_lcp + 'ms' : 'N/A'}`,
    robots: { index: false, follow: false },
  };
}

/* ───────── Page ───────── */

export default async function BrowserTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = await getBrowserTest(id);

  if (!test) {
    notFound();
  }

  let isLocked = true;
  try {
    const session = await auth();
    if (session?.user?.id) {
      if (session.user.email === "erdi.doqan@gmail.com") {
        isLocked = false;
      } else {
        const subscription = await getUserSubscription(session.user.id);
        if (subscription && subscription.status === "active") {
          isLocked = false;
        }
      }
    }
  } catch {}

  return <BrowserTestDetailContent test={test} isLocked={isLocked} />;
}
