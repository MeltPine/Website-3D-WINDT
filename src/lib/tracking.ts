type TrackingPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, payload: TrackingPayload = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const cleanedPayload: Record<string, string | number | boolean | null> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanedPayload[key] = value;
    }
  });

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...cleanedPayload,
    });
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, cleanedPayload);
  }
}
