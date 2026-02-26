import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getD1Client } from "@/lib/d1-client";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { getUserSubscription } from "@/lib/subscription";
import { LoadTestDetailContent } from "./load-test-detail-content";
import type { SeoInfo } from "@/lib/load-test-analyze";

/* ───────── Types ───────── */

interface LoadTestDbRow {
  id: string;
  url: string;
  target_url: string;
  target_concurrent_users: number;
  total_requests: number;
  total_sent: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  rps: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  error_reasons: string | null;
  ramp_steps: string | null;
  stopped_reason: string | null;
  request_mode: string | null;
  ai_analysis: string | null;
  seo_info: string | null;
  status: string;
  created_at: number;
  updated_at: number | null;
}

export interface LoadTestData {
  id: string;
  url: string;
  target_url: string;
  target_concurrent_users: number;
  total_sent: number;
  total_ok: number;
  total_errors: number;
  duration_sec: number;
  rps: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  error_reasons: Record<string, number> | null;
  ramp_steps: Array<{
    concurrentUsers: number;
    actualConcurrency: number;
    sent: number;
    ok: number;
    errors: number;
    errorRate: number;
    rps: number;
    p50: number;
    p95: number;
    p99: number;
    durationSec: number;
    errorReasons?: Record<string, number>;
  }>;
  stopped_reason: string | null;
  ai_analysis: string | null;
  seo_info?: SeoInfo | null;
  status: string;
  created_at: number;
}

/* ───────── Data Fetching ───────── */

async function getLoadTest(id: string): Promise<LoadTestData | null> {
  try {
    if (!id || id.length < 10) return null;

    const db = getD1Client();
    const row = await db.queryFirst<LoadTestDbRow>(
      `SELECT id, url, target_url, target_concurrent_users,
              total_requests, total_sent, total_ok, total_errors,
              duration_sec, rps, p50, p95, p99,
              error_reasons, ramp_steps, stopped_reason,
              request_mode, ai_analysis, seo_info, status, created_at, updated_at
       FROM load_tests
       WHERE id = ?`,
      [id],
    );

    if (!row) return null;

    // "running" durumundaki test — stale mi kontrol et
    if (row.status === "running") {
      const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 dakika
      const isStale = Date.now() - row.created_at > STALE_THRESHOLD_MS;

      if (isStale) {
        // 5 dakikadan eski running test — otomatik olarak abandoned yap
        try {
          await db.execute(
            `UPDATE load_tests SET status = 'abandoned', updated_at = ? WHERE id = ? AND status = 'running'`,
            [Date.now(), row.id],
          );
        } catch {
          // DB hatası sayfayı engellemesin
        }
        return {
          id: row.id,
          url: row.url,
          target_url: row.target_url || row.url,
          target_concurrent_users: row.target_concurrent_users,
          total_sent: 0,
          total_ok: 0,
          total_errors: 0,
          duration_sec: 0,
          rps: 0,
          p50: null,
          p95: null,
          p99: null,
          error_reasons: null,
          ramp_steps: [],
          stopped_reason: null,
          ai_analysis: null,
          status: "abandoned",
          created_at: row.created_at,
        };
      }

      // Hâlâ taze — client tarafında poll ile güncelleme yapılacak
      return {
        id: row.id,
        url: row.url,
        target_url: row.target_url || row.url,
        target_concurrent_users: row.target_concurrent_users,
        total_sent: 0,
        total_ok: 0,
        total_errors: 0,
        duration_sec: 0,
        rps: 0,
        p50: null,
        p95: null,
        p99: null,
        error_reasons: null,
        ramp_steps: [],
        stopped_reason: null,
        ai_analysis: null,
        status: "running",
        created_at: row.created_at,
      };
    }

    return {
      id: row.id,
      url: row.url,
      target_url: row.target_url,
      target_concurrent_users: row.target_concurrent_users,
      total_sent: row.total_sent,
      total_ok: row.total_ok,
      total_errors: row.total_errors,
      duration_sec: row.duration_sec,
      rps: row.rps,
      p50: row.p50,
      p95: row.p95,
      p99: row.p99,
      error_reasons: row.error_reasons ? JSON.parse(row.error_reasons) : null,
      ramp_steps: row.ramp_steps ? JSON.parse(row.ramp_steps) : [],
      stopped_reason: row.stopped_reason,
      ai_analysis: row.ai_analysis,
      seo_info: row.seo_info ? JSON.parse(row.seo_info) : null,
      status: row.status,
      created_at: row.created_at,
    };
  } catch (err) {
    console.error("[load-test-detail] DB error:", err);
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
  const test = await getLoadTest(id);

  if (!test) {
    return {
      title: "Test Bulunamadı - UptimeTR",
    };
  }

  const urlDisplay = test.target_url || test.url;
  const errorRate = test.total_sent > 0
    ? Math.round((test.total_errors / test.total_sent) * 100)
    : 0;

  return {
    title: `Yük Testi Sonucu - ${urlDisplay} | UptimeTR`,
    description: `${urlDisplay} için yük testi sonuçları: ${test.total_sent.toLocaleString("tr-TR")} istek, ${test.target_concurrent_users} eşzamanlı kullanıcı, %${errorRate} hata oranı.`,
    openGraph: {
      title: `Yük Testi - ${urlDisplay}`,
      description: `${test.total_sent.toLocaleString("tr-TR")} istek gönderildi, ${test.target_concurrent_users} eşzamanlı kullanıcı test edildi.`,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

/* ───────── Page ───────── */

export default async function LoadTestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = await getLoadTest(id);

  if (!test) {
    notFound();
  }

  let isLocked = true;
  try {
    const session = await auth();
    if (session?.user?.id) {
      // Admin her zaman unlocked
      if (session.user.email === "erdi.doqan@gmail.com") {
        isLocked = false;
      } else {
        const subscription = await getUserSubscription(session.user.id);
        if (subscription && subscription.status === "active") {
          isLocked = false;
        }
      }
    }
  } catch {
    // Auth hatası → kilitli kal
  }

  return <LoadTestDetailContent test={test} isLocked={isLocked} />;
}
