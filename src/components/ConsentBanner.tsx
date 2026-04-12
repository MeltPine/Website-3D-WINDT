import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsConsentState, setAnalyticsConsent, type AnalyticsConsentState } from '../lib/consent';
import { CloseIcon, CookieIcon } from './icons';

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

  const statusLabel =
    consentState === 'granted' ? 'Statistik-Cookies sind aktiviert' : 'Nur notwendige Cookies sind aktiv';

  return (
    <div className="consent-banner fixed inset-x-0 bottom-0 z-[70] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200/90 bg-white/90 shadow-[0_20px_44px_-28px_rgba(17,24,39,0.65)] backdrop-blur-md dark:border-slate-600/70 dark:bg-slate-900/90 animate-lift-in">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-300/40 dark:bg-primary-900/30 dark:text-primary-100">
                <CookieIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Cookie-Einstellungen</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                  Wir verwenden optionale Statistik-Cookies (GA4), um die Nutzung unserer Website zu verbessern.
                  Ohne Ihre Zustimmung werden keine Statistik-Cookies gesetzt. Details in der{' '}
                  <Link to="/datenschutz/" className="font-medium text-primary-700 underline hover:text-primary-800">
                    Datenschutzerklärung
                  </Link>
                  .
                </p>
              </div>
            </div>
            {consentState !== 'unset' && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                aria-label="Cookie-Banner schließen"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyChoice(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Nur notwendige Cookies
              </button>
              <button
                type="button"
                onClick={() => applyChoice(true)}
                className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors"
              >
                Statistik-Cookies erlauben
              </button>
            </div>
            {consentState !== 'unset' && (
              <p className="text-xs text-gray-500 dark:text-slate-400" aria-live="polite">
                Aktueller Status: <span className="font-medium">{statusLabel}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
