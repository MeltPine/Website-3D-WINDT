export type AnalyticsConsentState = 'unset' | 'granted' | 'denied';

const CONSENT_STORAGE_KEY = '3dw_analytics_consent_v1';
const CONSENT_EVENT = 'analytics-consent-updated';

function parseStoredValue(value: string | null): AnalyticsConsentState {
  if (value === 'granted' || value === 'denied') {
    return value;
  }
  return 'unset';
}

export function getAnalyticsConsentState(): AnalyticsConsentState {
  if (typeof window === 'undefined') {
    return 'unset';
  }

  try {
    return parseStoredValue(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return 'unset';
  }
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsentState() === 'granted';
}

export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  const nextState: AnalyticsConsentState = granted ? 'granted' : 'denied';

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, nextState);
  } catch {
    // Ignore storage failures and still notify listeners.
  }

  window.dispatchEvent(
    new CustomEvent<AnalyticsConsentState>(CONSENT_EVENT, {
      detail: nextState,
    }),
  );
}

export function subscribeAnalyticsConsent(
  listener: (state: AnalyticsConsentState) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onUpdate = (event: Event) => {
    const customEvent = event as CustomEvent<AnalyticsConsentState>;
    listener(customEvent.detail);
  };

  window.addEventListener(CONSENT_EVENT, onUpdate as EventListener);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onUpdate as EventListener);
  };
}
