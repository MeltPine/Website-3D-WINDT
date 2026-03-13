import { trackInternalLeadEvent } from './internalTracking';

type TrackingPayload = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<unknown>;
    gtag?: (...args: unknown[]) => void;
  }
}

function emitTrackingEvent(eventName: string, payload: Record<string, string | number | boolean | null>) {
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: eventName,
      ...payload,
    });
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, payload);
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

  emitTrackingEvent(eventName, cleanedPayload);
  trackInternalLeadEvent(eventName, cleanedPayload);

  // Mirror form submit into GA4 standard lead event for easier conversion setup.
  if (eventName === 'lead_form_submitted') {
    emitTrackingEvent('generate_lead', {
      source_event: eventName,
      ...cleanedPayload,
    });
    trackInternalLeadEvent('generate_lead', {
      source_event: eventName,
      ...cleanedPayload,
    });
  }
}
