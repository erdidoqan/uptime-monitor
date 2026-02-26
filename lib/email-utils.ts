import { createHmac } from 'crypto';

/* ───────── Config ───────── */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.uptimetr.com';
const UNSUBSCRIBE_SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || 'uptimetr-unsub-default-secret';

/* ───────── HMAC Token ───────── */

export function generateUnsubscribeToken(userId: string): string {
  return createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId);
  return expected === token;
}

export function generateUnsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId);
  return `${BASE_URL}/api/email/unsubscribe?uid=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
}

/* ───────── Campaign Email Template ───────── */

interface CampaignEmailParams {
  userName?: string | null;
  loadTestId: string | null;
  loadTestUrl?: string | null;
  unsubscribeUrl: string;
}

/**
 * Pro upgrade kampanya emaili HTML'i uretir.
 * Indirim kodu blogu sabit (yuzde25), degisken degil.
 */
export function generateCampaignEmail(params: CampaignEmailParams): string {
  const { userName, loadTestId, loadTestUrl, unsubscribeUrl } = params;

  const greeting = userName ? `Merhaba ${userName},` : 'Merhaba,';
  const hasLoadTest = !!loadTestId;
  const testLink = hasLoadTest ? `${BASE_URL}/load-test/${loadTestId}` : `${BASE_URL}/load-test`;
  const testUrlDisplay = loadTestUrl || '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UptimeTR - ${hasLoadTest ? 'Yük Testi Sonuçlarınız Hazır' : 'Sitenizi Ücretsiz Test Edin'}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
</head>
<body style="margin: 0; padding: 0; background: #111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

<div style="max-width: 600px; margin: 0 auto; background: #0a0a0b;">

  <!-- ═══════════ HEADER ═══════════ -->
  <div style="padding: 28px 40px 24px 40px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06);">
    <a href="${BASE_URL}" style="text-decoration: none; display: inline-block;">
      <img src="${BASE_URL}/android-chrome-192x192.png" alt="UptimeTR Logo" width="36" height="36" style="border-radius: 10px; vertical-align: middle; margin-right: 10px;" />
      <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; vertical-align: middle;">UptimeTR</span>
    </a>
  </div>

  <!-- ═══════════ KISISEL GIRIS ═══════════ -->
  <div style="padding: 40px 40px 12px 40px;">
    <p style="margin: 0 0 6px 0; font-size: 16px; color: #d1d5db; line-height: 1.7;">
      ${escapeHtml(greeting)}
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; color: #9ca3af; line-height: 1.7;">
      ${hasLoadTest
        ? 'Geçen yaptığınız yük testinin sonuçları hazır! Sitenizin kaç eş zamanlı kullanıcıyı karşıladığını, yanıt sürelerini ve AI destekli analizi aşağıdaki linkten inceleyebilirsiniz.'
        : 'Siteniz aynı anda kaç kullanıcıyı kaldırabiliyor? UptimeTR ile <strong style="color: #d1d5db;">30 saniyede ücretsiz yük testi</strong> yaparak öğrenin. Eş zamanlı kullanıcı, yanıt süreleri ve AI destekli detaylı rapor sizi bekliyor.'}
    </p>
  </div>

  <!-- ═══════════ TEST SONUCU KARTI / DAVET KARTI ═══════════ -->
  <div style="margin: 0 40px 32px 40px;">
    ${hasLoadTest ? `
    <a href="${testLink}" style="display: block; text-decoration: none; padding: 20px 24px; background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.1)); border: 1px solid rgba(139,92,246,0.25); border-radius: 14px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td valign="middle">
            <div style="font-size: 13px; font-weight: 600; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Yük Testi Sonucunuz</div>
            ${testUrlDisplay ? `<div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">${escapeHtml(testUrlDisplay)}</div>` : ''}
            <div style="font-size: 16px; font-weight: 700; color: #ffffff;">Raporu Görüntüle &rarr;</div>
          </td>
          <td width="56" align="right" valign="middle">
            <div style="width: 48px; height: 48px; background: rgba(139,92,246,0.15); border-radius: 12px; text-align: center; line-height: 48px; font-size: 24px;">&#x1F4CA;</div>
          </td>
        </tr>
      </table>
    </a>
    ` : `
    <a href="${testLink}" style="display: block; text-decoration: none; padding: 20px 24px; background: linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1)); border: 1px solid rgba(6,182,212,0.25); border-radius: 14px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td valign="middle">
            <div style="font-size: 13px; font-weight: 600; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Ücretsiz Yük Testi</div>
            <div style="font-size: 14px; color: #9ca3af; margin-bottom: 6px;">URL'nizi girin, 30 saniyede sonuç alın</div>
            <div style="font-size: 16px; font-weight: 700; color: #ffffff;">Hemen Test Et &rarr;</div>
          </td>
          <td width="56" align="right" valign="middle">
            <div style="width: 48px; height: 48px; background: rgba(6,182,212,0.15); border-radius: 12px; text-align: center; line-height: 48px; font-size: 24px;">&#x1F680;</div>
          </td>
        </tr>
      </table>
    </a>
    `}
  </div>

  <!-- Ayirici -->
  <div style="margin: 0 40px; height: 1px; background: rgba(255,255,255,0.06);"></div>

  <!-- ═══════════ %25 INDIRIM KODU (SABIT) ═══════════ -->
  <div style="padding: 32px 40px;">
    <div style="padding: 28px 24px; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(234,179,8,0.06)); border: 2px solid rgba(16,185,129,0.3); border-radius: 16px; text-align: center;">
      <div style="display: inline-block; padding: 5px 14px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 20px; margin-bottom: 16px;">
        <span style="color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.3px;">%25 İNDİRİM</span>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #d1d5db; line-height: 1.6;">
        Sizin için özel bir indirim kodu hazırladık.<br>Pro plana geçerken bu kodu kullanın:
      </p>
      <div style="display: inline-block; padding: 14px 32px; background: rgba(255,255,255,0.06); border: 2px dashed rgba(16,185,129,0.5); border-radius: 10px; margin-bottom: 16px;">
        <span style="font-size: 28px; font-weight: 800; color: #10b981; letter-spacing: 3px; font-family: 'Courier New', monospace;">yuzde25</span>
      </div>
      <p style="margin: 0; font-size: 15px; color: #9ca3af;">
        <span style="text-decoration: line-through; color: #6b7280;">$5/ay</span>
        &nbsp;&rarr;&nbsp;
        <span style="font-size: 22px; font-weight: 800; color: #10b981;">$3.75</span><span style="color: #6b7280;">/ay</span>
      </p>
    </div>
  </div>

  <!-- ═══════════ PRO OZELLIKLERI ═══════════ -->
  <div style="padding: 0 40px 8px 40px;">
    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">
      Pro ile Neler Yapabilirsiniz?
    </h2>
  </div>

  <!-- Feature 1: Sinirsiz Yuk Testi -->
  <div style="margin: 0 40px 16px 40px; padding: 20px; background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="48" valign="top">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6, #a78bfa); border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">&#x26A1;</div>
        </td>
        <td style="padding-left: 14px;">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Sınırsız Yük Testi</div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">Free plandaki test limitini unutun. <strong style="color: #d1d5db;">10.000'e kadar eşanlı kullanıcı</strong> ile sınırsız test yapın, sitenizin gerçek kapasitesini keşfedin. Her test için AI destekli detaylı rapor alın.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Feature 2: Monitor -->
  <div style="margin: 0 40px 16px 40px; padding: 20px; background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="48" valign="top">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #14b8a6); border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">&#x1F50D;</div>
        </td>
        <td style="padding-left: 14px;">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">7/24 Uptime İzleme</div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">URL'lerinizi ekleyin, <strong style="color: #d1d5db;">1 dakika aralıklarla</strong> 7/24 izleyelim. Siteniz çökerse veya yavaşlarsa anında e-posta ve webhook bildirimi alın. Sınırsız monitör oluşturun.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Feature 3: Turkiye -->
  <div style="margin: 0 40px 16px 40px; padding: 20px; background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="48" valign="top">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ef4444, #f97316); border-radius: 10px; text-align: center; line-height: 40px; font-size: 14px;">&#x1F1F9;&#x1F1F7;</div>
        </td>
        <td style="padding-left: 14px;">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Türkiye'den Kontrol</div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">Kullanıcılarınız Türkiye'deyse, yanıt sürelerini <strong style="color: #d1d5db;">Türkiye'den ölçmek</strong> en doğrusu. Edge altyapımız sayesinde kullanıcının gerçekte yaşadığı deneyimi görün.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Feature 4: Durum Sayfasi -->
  <div style="margin: 0 40px 32px 40px; padding: 20px; background: #18181b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="48" valign="top">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b, #eab308); border-radius: 10px; text-align: center; line-height: 40px; font-size: 18px;">&#x1F4E2;</div>
        </td>
        <td style="padding-left: 14px;">
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">Durum Sayfası</div>
          <div style="font-size: 13px; color: #9ca3af; line-height: 1.6;">Müşterileriniz sorun yaşadığında <em style="color: #d1d5db;">&quot;mediamarkt çöktü mü?&quot;</em> diye Google'a yazmak zorunda kalmasın. Onlara profesyonel bir durum sayfası sunun: <strong style="color: #d1d5db;">status.sirketiniz.com</strong> &mdash; anlık durum, geçmiş olaylar ve bakım planları tek sayfada.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ═══════════ CTA ═══════════ -->
  <div style="padding: 0 40px 40px 40px; text-align: center;">
    <a href="${BASE_URL}/pricing" style="display: inline-block; padding: 16px 44px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; letter-spacing: -0.2px; box-shadow: 0 4px 24px rgba(16,185,129,0.3);">
      Pro'ya Geç &mdash; %25 İndirimli &rarr;
    </a>
    <p style="margin: 14px 0 0 0; font-size: 13px; color: #6b7280;">
      Kod: <strong style="color: #10b981; font-family: 'Courier New', monospace;">yuzde25</strong> &bull; Ödeme sırasında uygulayabilirsiniz
    </p>
  </div>

  <!-- ═══════════ FOOTER ═══════════ -->
  <div style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
      <a href="${BASE_URL}" style="color: #6b7280; text-decoration: none;">uptimetr.com</a> &bull;
      <a href="${BASE_URL}/pricing" style="color: #6b7280; text-decoration: none;">Fiyatlandırma</a> &bull;
      <a href="${BASE_URL}/contact" style="color: #6b7280; text-decoration: none;">İletişim</a>
    </p>
    <p style="margin: 0; font-size: 11px; color: #4b5563;">
      Bu e-postayı UptimeTR hesabınız sebebiyle aldınız.<br>
      Almak istemiyorsanız <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">abonelikten çıkın</a>.
    </p>
  </div>

</div>

</body>
</html>`;
}

/* ───────── Helpers ───────── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
