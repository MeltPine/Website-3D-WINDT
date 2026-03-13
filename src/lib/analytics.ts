import {
  getAnalyticsConsentState,
  hasAnalyticsConsent,
  subscribeAnalyticsConsent,
  type AnalyticsConsentState,
} from './consent';

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();

const ANALYTICS_DELAY_MS = 2500;
let initialized = false;
let pendingPagePath: string | null = null;
let hasAttachedConsentListener = false;

export type AnalyticsHealthSnapshot = {
  consentState: AnalyticsConsentState;
  measurementIdConfigured: boolean;
  measurementIdSuffix: string | null;
  initialized: boolean;
  gtagReady: boolean;
  dataLayerEntries: number;
  pendingPagePath: string | null;
  scriptPresent: boolean;
};

declare global {
  interface Window {
    dataLayer?: Array<unknown>;
    gtag?: (...args: unknown[]) => void;
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  }
}

function injectScript(id: string, src: string): void {
  if (document.getElementById(id) || document.querySelector(`script[src*="${src}"]`)) {
    return;
  }
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function ensureDataLayerStub(): void {
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
}

function flushPendingPageView(): void {
  if (!pendingPagePath || typeof window.gtag !== 'function') {
    return;
  }

  const path = pendingPagePath;
  pendingPagePath = null;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
  });
}

function toMeasurementIdSuffix(id: string): string | null {
  if (!id) {
    return null;
  }

  const suffixLength = 4;
  return id.length <= suffixLength ? id : id.slice(-suffixLength);
}

function bootstrapAnalytics(): void {
  if (initialized || typeof window === 'undefined' || !GA_MEASUREMENT_ID || !hasAnalyticsConsent()) {
    return;
  }

  initialized = true;
  ensureDataLayerStub();

  injectScript(
    'ga4-script-fallback',
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`,
  );

  window.gtag?.('js', new Date());
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  flushPendingPageView();
}

function ensureConsentListener(): void {
  if (hasAttachedConsentListener || typeof window === 'undefined') {
    return;
  }

  hasAttachedConsentListener = true;
  subscribeAnalyticsConsent((state) => {
    if (state === 'granted') {
      bootstrapAnalytics();
    }
  });
}

function scheduleBootstrap(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => bootstrapAnalytics(), {
      timeout: ANALYTICS_DELAY_MS,
    });
    return;
  }

  window.setTimeout(() => bootstrapAnalytics(), ANALYTICS_DELAY_MS);
}

export function initAnalytics(): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }

  ensureConsentListener();
  if (!hasAnalyticsConsent()) {
    return;
  }

  // If GA is already present in static HTML snippet, use it directly.
  if (typeof window.gtag === 'function') {
    initialized = true;
    flushPendingPageView();
    return;
  }

  ensureDataLayerStub();

  const activate = () => bootstrapAnalytics();
  window.addEventListener('pointerdown', activate, { once: true, passive: true });
  window.addEventListener('keydown', activate, { once: true });
  window.addEventListener('scroll', activate, { once: true, passive: true });

  scheduleBootstrap();
}

export function trackPageView(path: string): void {
  if (typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }

  if (!hasAnalyticsConsent()) {
    pendingPagePath = path;
    return;
  }

  if (!initialized || typeof window.gtag !== 'function') {
    pendingPagePath = path;
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
  });
}

export function getAnalyticsHealthSnapshot(): AnalyticsHealthSnapshot {
  if (typeof window === 'undefined') {
    return {
      consentState: 'unset',
      measurementIdConfigured: Boolean(GA_MEASUREMENT_ID),
      measurementIdSuffix: toMeasurementIdSuffix(GA_MEASUREMENT_ID),
      initialized,
      gtagReady: false,
      dataLayerEntries: 0,
      pendingPagePath,
      scriptPresent: false,
    };
  }

  const scriptPresent = Boolean(
    document.querySelector('script[src*="googletagmanager.com/gtag/js?id="]'),
  );

  return {
    consentState: getAnalyticsConsentState(),
    measurementIdConfigured: Boolean(GA_MEASUREMENT_ID),
    measurementIdSuffix: toMeasurementIdSuffix(GA_MEASUREMENT_ID),
    initialized,
    gtagReady: typeof window.gtag === 'function',
    dataLayerEntries: Array.isArray(window.dataLayer) ? window.dataLayer.length : 0,
    pendingPagePath,
    scriptPresent,
  };
}
