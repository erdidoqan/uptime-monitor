/**
 * Analytics utility for GTM dataLayer events
 * Facebook Pixel events are triggered via GTM dataLayer pushes
 */

// Extend Window interface for dataLayer
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * Push event to GTM dataLayer
 * GTM should be configured to trigger Facebook Pixel events based on these events
 */
export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

/**
 * Track user registration (CompleteRegistration)
 * Call this when a user signs up for the first time
 */
export function trackRegistration(params?: {
  method?: string;
  userId?: string;
}) {
  trackEvent('complete_registration', {
    method: params?.method || 'google',
    user_id: params?.userId,
  });
}

/**
 * Track checkout initiation (InitiateCheckout)
 * Call this when a user clicks to start checkout
 */
export function trackInitiateCheckout(params: {
  planName: string;
  value: number;
  currency?: string;
}) {
  trackEvent('initiate_checkout', {
    plan_name: params.planName,
    value: params.value,
    currency: params.currency || 'USD',
  });
}

/**
 * Track successful purchase (Purchase)
 * Call this when checkout is completed successfully
 */
export function trackPurchase(params: {
  planName: string;
  value: number;
  currency?: string;
  transactionId?: string;
}) {
  trackEvent('purchase', {
    plan_name: params.planName,
    value: params.value,
    currency: params.currency || 'USD',
    transaction_id: params.transactionId,
  });
}

/**
 * Track page view (PageView)
 * Useful for SPA navigation tracking
 */
export function trackPageView(params?: {
  pagePath?: string;
  pageTitle?: string;
}) {
  trackEvent('page_view', {
    page_path: params?.pagePath || (typeof window !== 'undefined' ? window.location.pathname : ''),
    page_title: params?.pageTitle || (typeof document !== 'undefined' ? document.title : ''),
  });
}

/* ───────── Load Test Events ───────── */

/**
 * Track load test page view (ViewContent)
 * Fires when user lands on /load-test page
 */
export function trackLoadTestPageView() {
  trackEvent('load_test_page_view', {
    content_type: 'load_test',
  });
}

/**
 * Track load test start (InitiateCheckout equivalent for load test)
 * Fires when user clicks "Testi Başlat" and test actually begins
 */
export function trackLoadTestStart(params: {
  url: string;
  concurrentUsers: number;
  userTier: string;
  isGuest: boolean;
}) {
  trackEvent('load_test_start', {
    test_url: params.url,
    concurrent_users: params.concurrentUsers,
    user_tier: params.userTier,
    is_guest: params.isGuest,
  });
}

/**
 * Track load test completion (Lead - PRIMARY CONVERSION EVENT)
 * Fires when a load test finishes successfully
 * This should be the main conversion event for Meta ads
 */
export function trackLoadTestComplete(params: {
  url: string;
  concurrentUsers: number;
  totalSent: number;
  totalErrors: number;
  durationSec: number;
  userTier: string;
  isGuest: boolean;
  runId: string;
}) {
  const errorRate = params.totalSent > 0
    ? Math.round((params.totalErrors / params.totalSent) * 100)
    : 0;

  trackEvent('load_test_complete', {
    test_url: params.url,
    concurrent_users: params.concurrentUsers,
    total_sent: params.totalSent,
    error_rate: errorRate,
    duration_sec: Math.round(params.durationSec),
    user_tier: params.userTier,
    is_guest: params.isGuest,
    run_id: params.runId,
  });
}

/**
 * Track Google sign-in prompt shown on load test page
 * Fires when guest test limit is reached and sign-in is prompted
 */
export function trackLoadTestSignInPrompt() {
  trackEvent('load_test_signin_prompt', {
    content_type: 'load_test',
  });
}

/**
 * Track Pro upgrade prompt shown on load test page
 * Fires when free test limit is reached or 100+ concurrent requested
 */
export function trackLoadTestUpgradePrompt(params: {
  reason: 'test_limit' | 'concurrent_limit';
  concurrentUsers?: number;
}) {
  trackEvent('load_test_upgrade_prompt', {
    reason: params.reason,
    concurrent_users: params.concurrentUsers,
  });
}
