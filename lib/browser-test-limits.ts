/**
 * Browser test tier limits, ramp steps, and validation
 */

import { isValidTargetUrl } from './load-test-limits';

export { isValidTargetUrl };

/* ───────── Tier Types ───────── */

export type UserTier = 'guest' | 'free' | 'pro' | 'enterprise';

/* ───────── Browser Limits ───────── */

export const GUEST_MAX_BROWSERS = 3;
export const FREE_MAX_BROWSERS = 5;
export const PRO_MAX_BROWSERS = 10;

export const GUEST_MAX_TABS = 3;
export const FREE_MAX_TABS = 5;
export const PRO_MAX_TABS = 10;

/** Misafir toplam test hakkı (hayat boyu) */
export const GUEST_MAX_TESTS = 1;
/** Giriş yapmış (free) kullanıcı toplam test hakkı */
export const FREE_MAX_TESTS = 2;

/** JWT expiration */
export const JWT_EXPIRY_SEC = 10 * 60; // 10 minutes (browser tests are slower)

export function getMaxBrowsersForTier(tier: UserTier): number {
  switch (tier) {
    case 'guest': return GUEST_MAX_BROWSERS;
    case 'free': return FREE_MAX_BROWSERS;
    case 'pro':
    case 'enterprise': return PRO_MAX_BROWSERS;
  }
}

export function getMaxTabsForTier(tier: UserTier): number {
  switch (tier) {
    case 'guest': return GUEST_MAX_TABS;
    case 'free': return FREE_MAX_TABS;
    case 'pro':
    case 'enterprise': return PRO_MAX_TABS;
  }
}

/* ───────── Ramp Steps ───────── */

/**
 * Her tier için ramp adımları (browser sayıları).
 * Her adımda belirtilen sayıda browser açılır,
 * her browser'da tier'ın max tab'ı kadar tab açılır.
 */
const RAMP_MILESTONES_GUEST = [1, 3] as const;
const RAMP_MILESTONES_FREE = [1, 3, 5] as const;
const RAMP_MILESTONES_PRO = [1, 3, 5, 7, 10] as const;

export function getRampSteps(targetBrowsers: number, tier: UserTier): number[] {
  let milestones: readonly number[];
  switch (tier) {
    case 'guest': milestones = RAMP_MILESTONES_GUEST; break;
    case 'free': milestones = RAMP_MILESTONES_FREE; break;
    case 'pro':
    case 'enterprise': milestones = RAMP_MILESTONES_PRO; break;
  }

  const steps = milestones.filter((m) => m <= targetBrowsers);
  if (steps.length === 0 || steps[steps.length - 1] !== targetBrowsers) {
    steps.push(targetBrowsers);
  }
  return steps;
}

/**
 * Tek batch kullanılıyor (streaming mimaride tüm browser'lar tek request'te).
 */
export function getMaxBatches(): number {
  return 1;
}

/* ───────── Validation ───────── */

export function isValidBrowserCount(n: number, maxAllowed?: number): boolean {
  const max = maxAllowed ?? PRO_MAX_BROWSERS;
  return typeof n === 'number' && n >= 1 && n <= max && Number.isInteger(n);
}

export function isValidTabCount(n: number, maxAllowed?: number): boolean {
  const max = maxAllowed ?? PRO_MAX_TABS;
  return typeof n === 'number' && n >= 1 && n <= max && Number.isInteger(n);
}
