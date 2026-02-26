/**
 * Load test tier limits, URL validation, and ramp-up step calculation
 */

export const GUEST_ALLOWED_REQUESTS = [1000, 2000, 3000] as const;
export const AUTH_ALLOWED_REQUESTS = [5000, 10000, 50000, 100000] as const;
export const ALL_ALLOWED_REQUESTS = [...GUEST_ALLOWED_REQUESTS, ...AUTH_ALLOWED_REQUESTS];

/** Tier bazlı maksimum toplam istek bütçesi */
export const GUEST_MAX_BUDGET = 3_000;
export const AUTH_MAX_BUDGET = 100_000;

export const GUEST_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const GUEST_RATE_LIMIT_MAX_RUNS = 3;

/** Cloudflare Free: 50 subrequest/request. Test öncesi URL analiz ile son URL kullanıldığı için Worker'da redirect yok; 50 güvenli. */
export const COUNT_PER_BATCH = 50;
export const JWT_EXPIRY_SEC = 5 * 60; // 5 minutes

/** Worker başına eşzamanlı bağlantı (Cloudflare 6). */
export const WORKER_CONCURRENT = 6;

/** Tier bazlı eşzamanlı kullanıcı limitleri */
export const GUEST_MAX_CONCURRENT = 50;
export const FREE_MAX_CONCURRENT = 100;
export const PRO_MAX_CONCURRENT = 10_000;

/** Slider UI'de gösterilecek max değer */
export const ENTERPRISE_MAX_CONCURRENT = 10_000;

/** Misafir toplam test hakkı (hayat boyu) */
export const GUEST_MAX_TESTS = 1;
/** Giriş yapmış (free) kullanıcı toplam test hakkı */
export const FREE_MAX_TESTS = 2;

/** Slider UI için varsayılan max (Pro tier) — dinamik olarak tier'a göre değişir */
export const MAX_CONCURRENT_USERS_SUGGESTED = 1000;
/** Eşzamanlı kullanıcı seçimi 10'ar artar (slider) */
export const CONCURRENT_USERS_STEP = 10;

/** Kullanıcı tipine göre max eşzamanlı kullanıcı döndürür */
export type UserTier = 'guest' | 'free' | 'pro' | 'enterprise';
export function getMaxConcurrentForTier(tier: UserTier): number {
  switch (tier) {
    case 'guest': return GUEST_MAX_CONCURRENT;
    case 'free': return FREE_MAX_CONCURRENT;
    case 'pro':
    case 'enterprise': return PRO_MAX_CONCURRENT;
  }
}

/** Ramp-up akıllı durdurma: ardışık N adımda hata oranı >= threshold → test durur */
export const RAMP_ERROR_RATE_STOP_THRESHOLD = 0.9;
export const RAMP_CONSECUTIVE_FAIL_STEPS = 2;

/**
 * Sabit ramp milestone'ları.
 * 10-50 arası 10'ar, sonra 100, 150, 200, 300, 400, ..., 1000, sonra 1000'er artarak 10000.
 */
export const RAMP_MILESTONES = [
  10, 20, 30, 40, 50,
  100, 150, 200, 300, 400, 500,
  600, 700, 800, 900, 1000,
  2000, 3000, 4000, 5000,
  6000, 7000, 8000, 9000, 10000,
] as const;

/**
 * Otomatik modda her adıma verilecek istek çarpanı (kaç tam eşzamanlılık turu).
 * 10 tur → 150 eşzamanlı kullanıcıda ~1 saniye sürekli yük (100ms latency ile).
 */
const AUTO_REQUEST_MULTIPLIER = 10;
/** Adım başına minimum istek */
const MIN_REQUESTS_PER_STEP = 100;

/* ───────── Helpers ───────── */

/** Değeri 10'un katına yuvarlar (min 10, max dynamicMax veya MAX_CONCURRENT_USERS_SUGGESTED) */
export function roundConcurrentUsers(n: number, maxConcurrent?: number): number {
  const step = CONCURRENT_USERS_STEP;
  const max = maxConcurrent ?? MAX_CONCURRENT_USERS_SUGGESTED;
  const rounded = Math.round(n / step) * step;
  return Math.max(10, Math.min(max, rounded));
}

/** Seçilen eşzamanlı kullanıcıya göre kaç paralel Worker çağrılacağı */
export function getBatchConcurrencyForConcurrentUsers(concurrentUsers: number): number {
  return Math.ceil(concurrentUsers / WORKER_CONCURRENT);
}

/* ───────── Ramp Steps ───────── */

/**
 * Hedef eşzamanlılığa göre sabit milestone listesinden ramp adımlarını döndürür.
 * totalRequests parametresi yok — adımlar her zaman aynı, istek bütçesi ayrı hesaplanır.
 */
export function generateRampSteps(targetConcurrency: number): number[] {
  const target = Math.max(10, Math.min(
    ENTERPRISE_MAX_CONCURRENT,
    Math.round(targetConcurrency / CONCURRENT_USERS_STEP) * CONCURRENT_USERS_STEP,
  ));

  const steps: number[] = RAMP_MILESTONES.filter((m) => m <= target);

  // Hedef milestone listesinde yoksa sona ekle
  if (steps.length === 0 || steps[steps.length - 1] !== target) {
    steps.push(target);
  }

  return steps;
}

/* ───────── Auto Request Calculation ───────── */

/**
 * Bir adım için ideal istek sayısı.
 * Hedef: Worker'ların 6 eşzamanlı bağlantısını dolu kullanarak
 * AUTO_REQUEST_MULTIPLIER kadar tam tur yapması.
 */
export function idealRequestsForStep(stepConcurrency: number): number {
  const minForConcurrency = Math.ceil(stepConcurrency / WORKER_CONCURRENT) * WORKER_CONCURRENT;
  return Math.max(MIN_REQUESTS_PER_STEP, minForConcurrency * AUTO_REQUEST_MULTIPLIER);
}

/**
 * Otomatik modda toplam istek sayısını hesaplar.
 * Her adıma idealRequestsForStep kadar istek verir, toplamı döndürür.
 */
export function calculateAutoRequests(steps: number[]): number {
  return steps.reduce((sum, step) => sum + idealRequestsForStep(step), 0);
}

/**
 * Bütçeyi adımlar arasında orantılı dağıtır.
 * Her adımın ağırlığı = idealRequestsForStep(stepConc).
 * Bütçe yetmezse oranla küçültür, minimum MIN_REQUESTS_PER_STEP altına düşerse adımı atlar.
 */
export function distributeRequestBudget(
  steps: number[],
  budget: number,
): { steps: number[]; requestsPerStep: number[] } {
  const ideals = steps.map((s) => idealRequestsForStep(s));
  const totalIdeal = ideals.reduce((a, b) => a + b, 0);

  if (budget >= totalIdeal) {
    // Bütçe yeterli → herkese ideal kadar
    return { steps, requestsPerStep: ideals };
  }

  // Oranla küçült, minimum altını at
  const ratio = budget / totalIdeal;
  const scaled = ideals.map((ideal) => Math.max(1, Math.round(ideal * ratio)));

  const filteredSteps: number[] = [];
  const filteredRequests: number[] = [];

  for (let i = 0; i < steps.length; i++) {
    if (scaled[i] >= MIN_REQUESTS_PER_STEP / 2) {
      // En az 50 istek düşen adımları tut
      filteredSteps.push(steps[i]);
      filteredRequests.push(scaled[i]);
    }
  }

  // Son adım (hedef) her zaman dahil
  if (filteredSteps.length === 0 || filteredSteps[filteredSteps.length - 1] !== steps[steps.length - 1]) {
    filteredSteps.push(steps[steps.length - 1]);
    filteredRequests.push(Math.max(MIN_REQUESTS_PER_STEP / 2, scaled[scaled.length - 1]));
  }

  // Toplam bütçeyi aşmamak için son ayar
  const currentTotal = filteredRequests.reduce((a, b) => a + b, 0);
  if (currentTotal > budget) {
    const adjustRatio = budget / currentTotal;
    for (let i = 0; i < filteredRequests.length; i++) {
      filteredRequests[i] = Math.max(1, Math.round(filteredRequests[i] * adjustRatio));
    }
  }

  return { steps: filteredSteps, requestsPerStep: filteredRequests };
}

/**
 * UI'da gösterilecek otomatik toplam istek sayısı (bütçe sınırlı).
 */
export function getAutoTotalRequests(targetConcurrency: number, isAuthenticated: boolean): number {
  const steps = generateRampSteps(targetConcurrency);
  const ideal = calculateAutoRequests(steps);
  const budget = isAuthenticated ? AUTH_MAX_BUDGET : GUEST_MAX_BUDGET;
  return Math.min(ideal, budget);
}

/** Eşzamanlı kullanıcı değeri geçerli mi? maxAllowed ile tier limiti verilebilir. */
export function isValidConcurrentUsers(n: number, maxAllowed?: number): boolean {
  const max = maxAllowed ?? ENTERPRISE_MAX_CONCURRENT;
  return (
    typeof n === 'number' &&
    n >= 10 &&
    n <= max &&
    n % CONCURRENT_USERS_STEP === 0
  );
}

export function isAllowedTotalRequests(totalRequests: number, isAuthenticated: boolean): boolean {
  const maxBudget = isAuthenticated ? AUTH_MAX_BUDGET : GUEST_MAX_BUDGET;
  return totalRequests >= 1 && totalRequests <= maxBudget;
}

/** Yük testi yapılması engellenen büyük ölçekli domainler */
const BLOCKED_DOMAINS = [
  // ── E-ticaret TR ──
  'trendyol.com', 'hepsiburada.com', 'n11.com', 'gittigidiyor.com',
  'ciceksepeti.com', 'sahibinden.com', 'amazon.com.tr', 'letgo.com',
  'dolap.com', 'modanisa.com', 'boyner.com.tr', 'lcwaikiki.com',
  'akakce.com', 'cimri.com', 'morhipo.com', 'koton.com',
  'defacto.com.tr', 'mavi.com', 'colins.com.tr', 'vakko.com',
  'teknosa.com', 'mediamarkt.com.tr', 'vatan.com.tr',
  'migros.com.tr', 'a101.com.tr', 'bim.com.tr', 'carrefoursa.com',
  'yemeksepeti.com', 'getir.com', 'banabi.com.tr', 'istegelsin.com',
  'temu.com', 'shein.com', 'aliexpress.com', 'alibaba.com',
  'ebay.com', 'etsy.com', 'walmart.com', 'target.com',
  'shopier.com',

  // ── Arama Motorları ──
  'google.com', 'google.com.tr', 'bing.com', 'yahoo.com',
  'yandex.com', 'yandex.com.tr', 'yandex.ru', 'duckduckgo.com',
  'baidu.com', 'ask.com', 'ecosia.org',

  // ── Sosyal Medya ──
  'youtube.com', 'facebook.com', 'meta.com', 'instagram.com',
  'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com',
  'pinterest.com', 'snapchat.com', 'tumblr.com', 'threads.net',
  'reddit.com', 'quora.com',

  // ── Mesajlaşma / İletişim ──
  'whatsapp.com', 'telegram.org', 'discord.com', 'signal.org',
  'zoom.us', 'slack.com', 'teams.microsoft.com', 'skype.com',

  // ── Teknoloji / Global Dev ──
  'microsoft.com', 'apple.com', 'amazon.com', 'netflix.com',
  'spotify.com', 'openai.com', 'chatgpt.com', 'anthropic.com',
  'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
  'cloudflare.com', 'wikipedia.org', 'archive.org',
  'twitch.tv', 'vimeo.com', 'dailymotion.com',
  'paypal.com', 'stripe.com', 'wise.com',
  'dropbox.com', 'box.com', 'drive.google.com',
  'icloud.com', 'office.com', 'live.com', 'outlook.com',
  'adobe.com', 'canva.com', 'figma.com',
  'nvidia.com', 'intel.com', 'amd.com', 'samsung.com',
  'huawei.com', 'xiaomi.com', 'sony.com',

  // ── Finans TR ──
  'garanti.com.tr', 'garantibbva.com.tr', 'yapikredi.com.tr', 'isbank.com.tr',
  'akbank.com', 'ziraatbank.com.tr', 'qnbfinansbank.com', 'halkbank.com.tr',
  'vakifbank.com.tr', 'denizbank.com', 'ingbank.com.tr', 'enpara.com',
  'hsbc.com.tr', 'sekerbank.com.tr', 'anadolubank.com.tr',
  'kuveytturk.com.tr', 'albaraka.com.tr', 'turkiyefinans.com.tr',
  'papara.com', 'tosla.com', 'param.com.tr', 'iyzico.com', 'paytr.com',
  'bkm.com.tr', 'troy.com.tr',

  // ── Finans Global ──
  'jpmorgan.com', 'goldmansachs.com', 'citi.com', 'bankofamerica.com',
  'hsbc.com', 'barclays.com', 'ubs.com', 'visa.com', 'mastercard.com',

  // ── Devlet / Kamu TR ──
  'gov.tr', 'edu.tr', 'mil.tr', 'k12.tr', 'bel.tr', 'pol.tr',
  'tccb.gov.tr', 'turkiye.gov.tr', 'meb.gov.tr', 'saglik.gov.tr',
  'uyap.gov.tr', 'enabiz.gov.tr', 'ptt.gov.tr', 'sgk.gov.tr',

  // ── Devlet / Kamu Global ──
  'gov.uk', 'gov.us', 'europa.eu', 'un.org', 'nato.int',

  // ── Telekom TR ──
  'turktelekom.com.tr', 'turkcell.com.tr', 'vodafone.com.tr',
  'superonline.net', 'turk.net',

  // ── Havayolları / Ulaşım ──
  'thy.com', 'turkishairlines.com', 'pegasus.com.tr',
  'biletall.com', 'enuygun.com', 'obilet.com',
  'booking.com', 'airbnb.com', 'trivago.com', 'expedia.com',

  // ── Medya TR ──
  'hurriyet.com.tr', 'milliyet.com.tr', 'sabah.com.tr', 'haberturk.com',
  'ntv.com.tr', 'cnnturk.com', 'sozcu.com.tr', 'cumhuriyet.com.tr',
  'ensonhaber.com', 'mynet.com', 'star.com.tr', 'aksam.com.tr',
  'yenisafak.com', 'takvim.com.tr', 'posta.com.tr',
  'haberler.com', 'internethaber.com', 'gazeteduvar.com.tr',

  // ── Medya Global ──
  'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'washingtonpost.com',
  'theguardian.com', 'reuters.com', 'bloomberg.com', 'forbes.com',
  'aljazeera.com', 'dw.com', 'france24.com',

  // ── Blog Platformları ──
  'blogspot.com', 'blogger.com', 'wordpress.com', 'medium.com',
  'substack.com', 'wix.com', 'squarespace.com', 'weebly.com',

  // ── Altyapı / CDN / Cloud / Hosting ──
  'aws.amazon.com', 'azure.microsoft.com', 'cloud.google.com',
  'vercel.com', 'heroku.com', 'digitalocean.com', 'netlify.com',
  'linode.com', 'vultr.com', 'hetzner.com', 'ovh.com', 'godaddy.com',
  'namecheap.com', 'hostinger.com', 'bluehost.com',
  'fastly.com', 'akamai.com', 'maxcdn.com', 'bunny.net',
  'cpanel.net', 'plesk.com',

  // ── Sigorta / Sağlık TR ──
  'acilservis.saglik.gov.tr', 'acibadem.com.tr', 'memorial.com.tr',
  'medicana.com.tr', 'florence.com.tr', 'livhospital.com',

  // ── Eğitim / Üniversite (popüler) ──
  'udemy.com', 'coursera.org', 'edx.org', 'khanacademy.org',

  'uptimetr.com',

  // ── Oyun / Eğlence ──
  'steampowered.com', 'epicgames.com', 'roblox.com',
  'playstation.com', 'xbox.com', 'nintendo.com',
  'disneyplus.com', 'hbomax.com', 'primevideo.com',
  'bluutv.com', 'exxen.com', 'gain.tv',

  // ── Yetişkin içerik siteleri ──
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com',
  'redtube.com', 'youporn.com', 'tube8.com', 'spankbang.com',
  'brazzers.com', 'onlyfans.com', 'chaturbate.com', 'stripchat.com',
  'livejasmin.com', 'bongacams.com', 'cam4.com', 'myfreecams.com',
  'hentaihaven.xxx', 'rule34.xxx',

  // ── Kumar / Bahis ──
  'bet365.com', 'betfair.com', 'bwin.com', 'williamhill.com',
  'pokerstars.com', '1xbet.com', 'betway.com', 'unibet.com',
  'nesine.com', 'iddaa.com', 'misli.com', 'bilyoner.com',
  'bets10.com', 'tipobet.com', 'youwin.com',
] as const;

function isBlockedDomain(hostname: string): boolean {
  return BLOCKED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d),
  );
}

export function isValidTargetUrl(urlString: string): { valid: boolean; error?: string; blockedDomain?: boolean } {
  try {
    const url = new URL(urlString);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'Sadece HTTP ve HTTPS desteklenir' };
    }
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return { valid: false, error: 'Özel veya yerel adreslere istek atılamaz' };
    }
    if (isBlockedDomain(hostname)) {
      return {
        valid: false,
        blockedDomain: true,
        error: 'Kullanım politikalarımız gereği, size ait olmayan sitelere yük testi yapılamaz. Yük testini yalnızca kendi web siteniz veya API\'niz üzerinde gerçekleştirin. Anlaşyışınız için teşekkür ederiz. ☺️',
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Geçersiz URL' };
  }
}

export function getBatches(totalRequests: number): { batches: number; countPerBatch: number } {
  const countPerBatch = COUNT_PER_BATCH;
  const batches = Math.ceil(totalRequests / countPerBatch);
  return { batches, countPerBatch };
}
