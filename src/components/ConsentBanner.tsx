import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsConsentState, setAnalyticsConsent, type AnalyticsConsentState } from '../lib/consent';

const OPEN_CONSENT_EVENT = 'open-consent-settings';

export default function ConsentBanner() {
  const [consentState, setConsentState] = useState<AnalyticsConsentState>('unset');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const state = getAnalyticsConsentState();
    setConsentState(state);
    setIsOpen(state === 'unset');

    const openHandler = () => setIsOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, openHandler);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, openHandler);
    };
  }, []);

  const applyChoice = (granted: boolean) => {
    setAnalyticsConsent(granted);
    const nextState: AnalyticsConsentState = granted ? 'granted' : 'denied';
    setConsentState(nextState);
    setIsOpen(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="consent-banner fixed bottom-0 left-0 right-0 z-[70] border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          <p className="text-sm text-gray-700 leading-relaxed lg:flex-1">
            Wir nutzen optionales Analytics (GA4), um Funnel-Abbrueche und Nutzbarkeit zu messen.
            Ohne Ihre Zustimmung bleibt Tracking deaktiviert. Details in der{' '}
            <Link to="/datenschutz/" className="text-primary-700 underline hover:text-primary-800">
              Datenschutzerklaerung
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => applyChoice(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Nur notwendige
            </button>
            <button
              type="button"
              onClick={() => applyChoice(true)}
              className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              Analytics erlauben
            </button>
            {consentState !== 'unset' && (
              <span className="text-xs text-gray-500">
                Aktueller Status: {consentState === 'granted' ? 'erlaubt' : 'abgelehnt'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
