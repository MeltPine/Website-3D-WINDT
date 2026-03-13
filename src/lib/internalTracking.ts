type InternalTrackingPayload = Record<string, string | number | boolean | null>;

const INTERNAL_TRACKING_ENABLED = (import.meta.env.VITE_INTERNAL_TRACKING_ENABLED ?? '1').trim() !== '0';
const SESSION_STORAGE_KEY = '3dw_internal_tracking_session_v1';
const MAX_PAYLOAD_CHARS = 1400;

function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now().toString(36)}_${randomPart}`;
}

function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const next = createSessionId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
  } catch {
    return 'storage_unavailable';
  }
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}...`;
}

function payloadToJson(payload: InternalTrackingPayload): string {
  const safePayload: Record<string, string | number | boolean | null> = {};
  Object.entries(payload).forEach(([key, value]) => {
    safePayload[key] = value;
  });

  try {
    return truncate(JSON.stringify(safePayload), MAX_PAYLOAD_CHARS);
  } catch {
    return '{"error":"payload_stringify_failed"}';
  }
}

function buildBody(eventName: string, payload: InternalTrackingPayload): URLSearchParams {
  const params = new URLSearchParams();
  params.set('form-name', 'lead-metric');
  params.set('event_name', eventName);
  params.set('source_path', window.location.pathname);
  params.set('page_url', window.location.href);
  params.set('session_id', getSessionId());
  params.set('occurred_at', new Date().toISOString());
  params.set('payload_json', payloadToJson(payload));

  const formName = payload.form;
  if (typeof formName === 'string' && formName) {
    params.set('form_name', formName);
  }

  const useCase = payload.use_case;
  if (typeof useCase === 'string' && useCase) {
    params.set('use_case', useCase);
  }

  return params;
}

function sendWithBeacon(body: URLSearchParams): boolean {
  if (typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  try {
    const blob = new Blob([body.toString()], {
      type: 'application/x-www-form-urlencoded;charset=UTF-8',
    });
    return navigator.sendBeacon('/', blob);
  } catch {
    return false;
  }
}

function sendWithFetch(body: URLSearchParams): void {
  void fetch('/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body.toString(),
    keepalive: true,
  }).catch(() => {
    // Internal tracking is best-effort and must never block lead actions.
  });
}

export function trackInternalLeadEvent(
  eventName: string,
  payload: InternalTrackingPayload = {},
): void {
  if (!INTERNAL_TRACKING_ENABLED || typeof window === 'undefined') {
    return;
  }

  const body = buildBody(eventName, payload);
  const sentWithBeacon = sendWithBeacon(body);
  if (!sentWithBeacon) {
    sendWithFetch(body);
  }
}
