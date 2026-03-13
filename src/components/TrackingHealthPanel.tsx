import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getAnalyticsHealthSnapshot } from '../lib/analytics';
import { trackEvent } from '../lib/tracking';

const DEBUG_STORAGE_KEY = '3dw_tracking_debug';

function boolLabel(value: boolean): string {
  return value ? 'ja' : 'nein';
}

export default function TrackingHealthPanel() {
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState(() => getAnalyticsHealthSnapshot());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(location.search);
    const queryToggle = params.get('tracking_debug');

    if (queryToggle === '1') {
      try {
        window.localStorage.setItem(DEBUG_STORAGE_KEY, '1');
      } catch {
        // Ignore localStorage errors.
      }
      setEnabled(true);
      return;
    }

    if (queryToggle === '0') {
      try {
        window.localStorage.removeItem(DEBUG_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors.
      }
      setEnabled(false);
      return;
    }

    try {
      setEnabled(window.localStorage.getItem(DEBUG_STORAGE_KEY) === '1');
    } catch {
      setEnabled(false);
    }
  }, [location.search]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    setSnapshot(getAnalyticsHealthSnapshot());
    const refreshInterval = window.setInterval(() => {
      setSnapshot(getAnalyticsHealthSnapshot());
    }, 2000);

    return () => {
      window.clearInterval(refreshInterval);
    };
  }, [enabled, location.pathname, location.search]);

  if (!enabled) {
    return null;
  }

  const hidePanel = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(DEBUG_STORAGE_KEY);
      } catch {
        // Ignore localStorage errors.
      }
    }
    setEnabled(false);
  };

  const refreshSnapshot = () => {
    setSnapshot(getAnalyticsHealthSnapshot());
  };

  const sendPing = () => {
    trackEvent('tracking_healthcheck_ping', {
      path: `${location.pathname}${location.search}`,
      consent_state: snapshot.consentState,
      panel_mode: 'query_or_storage',
    });
    setLastPingAt(new Date().toLocaleTimeString('de-DE'));
    refreshSnapshot();
  };

  return (
    <aside className="fixed top-3 right-3 z-[80] w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-primary-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-primary-700 font-semibold">
            Tracking Healthcheck
          </p>
          <p className="text-[11px] text-gray-600">Nur sichtbar mit `?tracking_debug=1`</p>
        </div>
        <button
          type="button"
          onClick={hidePanel}
          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
        >
          Schließen
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-gray-600">Consent</dt>
        <dd className="font-semibold text-gray-900">{snapshot.consentState}</dd>
        <dt className="text-gray-600">GA-ID gesetzt</dt>
        <dd className="font-semibold text-gray-900">
          {boolLabel(snapshot.measurementIdConfigured)}
          {snapshot.measurementIdSuffix ? ` (...${snapshot.measurementIdSuffix})` : ''}
        </dd>
        <dt className="text-gray-600">Initialisiert</dt>
        <dd className="font-semibold text-gray-900">{boolLabel(snapshot.initialized)}</dd>
        <dt className="text-gray-600">`gtag` bereit</dt>
        <dd className="font-semibold text-gray-900">{boolLabel(snapshot.gtagReady)}</dd>
        <dt className="text-gray-600">Script geladen</dt>
        <dd className="font-semibold text-gray-900">{boolLabel(snapshot.scriptPresent)}</dd>
        <dt className="text-gray-600">dataLayer Einträge</dt>
        <dd className="font-semibold text-gray-900">{snapshot.dataLayerEntries}</dd>
        <dt className="text-gray-600">Pending Pageview</dt>
        <dd className="font-semibold text-gray-900">{snapshot.pendingPagePath ?? '-'}</dd>
        <dt className="text-gray-600">Pfad</dt>
        <dd className="font-semibold text-gray-900">{`${location.pathname}${location.search}`}</dd>
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={refreshSnapshot}
          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
        >
          Aktualisieren
        </button>
        <button
          type="button"
          onClick={sendPing}
          className="rounded-md bg-primary-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-800"
        >
          Testevent senden
        </button>
        {lastPingAt && <p className="text-[11px] text-gray-500">Ping: {lastPingAt}</p>}
      </div>
    </aside>
  );
}
