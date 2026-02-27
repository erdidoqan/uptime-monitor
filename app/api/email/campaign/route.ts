import { NextRequest } from 'next/server';
import { getD1Client } from '@/lib/d1-client';
import { getUnosendClient } from '@/lib/unosend-client';
import { generateCampaignEmail, generateUnsubscribeUrl } from '@/lib/email-utils';
import { errorResponse, successResponse } from '@/lib/api-helpers';

/* ───────── Types ───────── */

interface TargetUser {
  id: string;
  email: string;
  name: string | null;
  load_test_id: string | null;
  test_url: string | null;
  target_concurrent_users: number | null;
}

/* ───────── Config ───────── */

const CAMPAIGN_SECRET = process.env.CAMPAIGN_API_SECRET;
const FROM_EMAIL = process.env.UNOSEND_FROM_EMAIL || '[email protected]';
const BATCH_DELAY_MS = 150;

/**
 * POST /api/email/campaign
 *
 * Admin korumali kampanya gonderim endpoint'i.
 * Header: X-Campaign-Secret: <CAMPAIGN_API_SECRET>
 *
 * Body:
 *   campaign: string  -- kampanya adi (orn: "pro_upgrade_loadtest_v1")
 *   dryRun?: boolean  -- true ise email gondermez, sadece hedef kitleyi dondurur
 *   limit?: number    -- max kac kullaniciya gonderilsin (varsayilan: 50)
 *   testEmail?: string -- test modu: bu emaile gonder (hedef kitle sorgusunu bypass eder)
 *   testLoadTestId?: string -- test modu: kullanilacak load test ID
 */
export async function POST(request: NextRequest) {
  try {
    // Admin auth
    const secret = request.headers.get('x-campaign-secret');
    if (!CAMPAIGN_SECRET || secret !== CAMPAIGN_SECRET) {
      return errorResponse('Yetkisiz erisim', 401);
    }

    const body = await request.json();
    const campaign: string = body.campaign;
    const dryRun: boolean = body.dryRun === true;
    const limit: number = Math.min(body.limit || 100, 500);
    const testEmail: string | undefined = body.testEmail;
    const testLoadTestId: string | undefined = body.testLoadTestId;

    if (!campaign || typeof campaign !== 'string') {
      return errorResponse('campaign alani gerekli', 400);
    }

    const db = getD1Client();

    let targets: TargetUser[];

    // ─── Test modu: belirli bir emaile gonder ───
    if (testEmail) {
      const user = await db.queryFirst<{ id: string; email: string; name: string | null }>(
        'SELECT id, email, name FROM users WHERE email = ?',
        [testEmail],
      );
      if (!user) {
        return errorResponse(`Kullanici bulunamadi: ${testEmail}`, 404);
      }

      let loadTest: { id: string; url: string; target_concurrent_users: number } | null = null;
      if (testLoadTestId) {
        loadTest = await db.queryFirst(
          'SELECT id, url, target_concurrent_users FROM load_tests WHERE id = ?',
          [testLoadTestId],
        );
      }
      if (!loadTest) {
        loadTest = await db.queryFirst(
          `SELECT id, url, target_concurrent_users FROM load_tests 
           WHERE user_id = ? AND status IN ('completed', 'stopped', 'smart_stopped')
           ORDER BY created_at DESC LIMIT 1`,
          [user.id],
        );
      }

      targets = [{
        id: user.id,
        email: user.email,
        name: user.name,
        load_test_id: loadTest?.id || null,
        test_url: loadTest?.url || null,
        target_concurrent_users: loadTest?.target_concurrent_users || null,
      }];
    } else {
      // ─── Normal mod: Hedef kitle sorgusu ───
      // Tum kayitli kullanicilar:
      //   - Abonelikten cikmamis (email_unsubscribes)
      //   - Bu kampanyayla daha once mail almamis (email_sends)
      //   - Banlanmamis
      // Load test yapmis olanlar icin en son test sonucu da dahil edilir
      targets = await db.queryAll<TargetUser>(
        `SELECT u.id, u.email, u.name,
                lt.id as load_test_id, lt.url as test_url, lt.target_concurrent_users
         FROM users u
         LEFT JOIN (
           SELECT user_id, id, url, target_concurrent_users, created_at,
                  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
           FROM load_tests
         ) lt ON lt.user_id = u.id AND lt.rn = 1
         LEFT JOIN email_unsubscribes eu ON eu.user_id = u.id
         LEFT JOIN email_sends es ON es.user_id = u.id AND es.campaign = ?
         WHERE eu.id IS NULL
           AND es.id IS NULL
           AND (u.is_banned IS NULL OR u.is_banned = 0)
         ORDER BY u.created_at ASC
         LIMIT ?`,
        [campaign, limit],
      );
    }

    if (!targets || targets.length === 0) {
      return successResponse({
        campaign,
        dryRun,
        totalTargets: 0,
        sent: 0,
        skipped: 0,
        errors: 0,
        message: 'Gonderilecek kullanici bulunamadi',
      });
    }

    // Dry run: sadece hedef kitleyi dondur
    if (dryRun) {
      return successResponse({
        campaign,
        dryRun: true,
        totalTargets: targets.length,
        targets: targets.map((t) => ({
          userId: t.id,
          email: t.email,
          name: t.name,
          loadTestId: t.load_test_id,
          testUrl: t.test_url,
        })),
      });
    }

    // ─── Email gonderimi ───
    const unosend = getUnosendClient();
    if (!unosend) {
      return errorResponse('Unosend yapilandirmasi eksik (UNOSEND_API_KEY)', 500);
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;
    const results: Array<{ email: string; status: 'sent' | 'error'; error?: string }> = [];

    for (const target of targets) {
      try {
        // Unsubscribe URL olustur
        const unsubscribeUrl = generateUnsubscribeUrl(target.id);

        // Email HTML olustur
        const hasLoadTest = !!target.load_test_id;
        const html = generateCampaignEmail({
          userName: target.name,
          loadTestId: target.load_test_id,
          loadTestUrl: target.test_url,
          unsubscribeUrl,
        });

        const subjects = [
          'Sitenize gerçek trafik gönderin — UptimeTR',
          'Siteniz kaç kişiyi kaldırıyor? Hemen test edin',
          'Ücretsiz yük testi + %25 Pro indirim kodu',
          'Web sitenizi 7/24 izleyin — UptimeTR',
          'Sitenize organik ziyaretçi gönderin, Analytics\'te görün',
          'Gerçek tarayıcı trafiği ile sitenizi canlandırın',
          'UptimeTR ile sitenizin performansını ölçün',
        ];
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        const subject = subjects[dayOfYear % subjects.length];

        // Unosend ile gonder
        const { error: sendError } = await unosend.emails.send({
          from: FROM_EMAIL,
          to: target.email,
          subject,
          html,
        });

        if (sendError) {
          console.error(`[campaign] Send failed for ${target.email}:`, sendError);
          errors++;
          results.push({ email: target.email, status: 'error', error: String(sendError) });
          continue;
        }

        // email_sends tablosuna kaydet
        await db.execute(
          `INSERT INTO email_sends (id, user_id, email, campaign, metadata, sent_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            target.id,
            target.email,
            campaign,
            JSON.stringify({
              loadTestId: target.load_test_id,
              testUrl: target.test_url,
              discountCode: 'yuzde25',
            }),
            Date.now(),
          ],
        );

        sent++;
        results.push({ email: target.email, status: 'sent' });

        // Rate limiting
        if (BATCH_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      } catch (err) {
        console.error(`[campaign] Error for ${target.email}:`, err);
        errors++;
        results.push({
          email: target.email,
          status: 'error',
          error: err instanceof Error ? err.message : 'Bilinmeyen hata',
        });
      }
    }

    return successResponse({
      campaign,
      dryRun: false,
      totalTargets: targets.length,
      sent,
      skipped,
      errors,
      results,
    });
  } catch (err) {
    console.error('[campaign] Error:', err);
    return errorResponse('Kampanya gonderilemedi', 500);
  }
}
