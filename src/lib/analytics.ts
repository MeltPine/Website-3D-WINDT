const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();

const ANALYTICS_DELAY_MS = 2500;
let initialized = false;
let pendingPagePath: string | null = null;

declare global {
  interface Window {
    dataLayer?: Array<unknown>;
    gtag?: (...args: unknown[]) => void;
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  }
}

function injectScript(id: string, src: string): void {
  if (document.getElementById(id)) {
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

function bootstrapAnalytics(): void {
  if (initialized || typeof window === 'undefined' || !GA_MEASUREMENT_ID) {
    return;
  }

  initialized = true;
  ensureDataLayerStub();

  injectScript(
    'ga4-script',
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`,
  );

  window.gtag?.('js', new Date());
  window.gtag?.('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false,
  });

  if (pendingPagePath) {
    const path = pendingPagePath;
    pendingPagePath = null;
    window.gtag?.('event', 'page_view', {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
    });
  }
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

  if (!initialized || typeof window.gtag !== 'function') {
    pendingPagePath = path;
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
  });
}
