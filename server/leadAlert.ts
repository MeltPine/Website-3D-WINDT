import type { Env, KVNamespaceLike } from './env';
import { jsonResponse } from './http';
import { LEAD_FORM_LABEL, isLeadFormName } from './leadSchema';
import { readMailConfig } from './mailConfig';
import { isSameOriginJsonPost, readLimitedText } from './paymentHttp';
import { RATE_LIMITS, enforceRateLimit } from './rateLimit';
import { escapeHtml, type SendMail } from './resend';

/*
 * POST /api/lead-alert — internal alert mail when a lead form submission or
 * file upload failed in the browser. Same-origin JSON only, no CORS, rate
 * limited, and it only ever mails LEAD_SALES_EMAIL (never a client-supplied
 * address), so it cannot be abused as a mail relay.
 */

const MAX_ALERT_BODY_BYTES = 16 * 1024;
const MAX_FORM_ENTRIES = 30;
const MAX_VALUE_LENGTH = 500;

export interface LeadAlertDeps {
  env: Env;
  kv: KVNamespaceLike;
  sendMail: SendMail;
  now: () => Date;
  newId: () => string;
}

function clean(value: unknown, maxLength = MAX_VALUE_LENGTH): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function toSafeEntries(formData: unknown): Array<[string, string]> {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return [];
  }
  return Object.entries(formData as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
    .slice(0, MAX_FORM_ENTRIES)
    .map(([key, value]) => [
      key.slice(0, 100),
      (value === null ? 'null' : typeof value === 'string' ? value : String(value)).slice(0, MAX_VALUE_LENGTH),
    ]);
}

export async function handleLeadAlert(request: Request, deps: LeadAlertDeps): Promise<Response> {
  if (!isSameOriginJsonPost(request)) {
    return jsonResponse(request.method === 'POST' ? 403 : 405, { error: 'Anfrage nicht erlaubt.' });
  }
  const limited = await enforceRateLimit(deps.kv, RATE_LIMITS.leadAlert, request, deps.now().getTime());
  if (limited) {
    return limited;
  }
  const raw = await readLimitedText(request, MAX_ALERT_BODY_BYTES);
  if (raw === null) {
    return jsonResponse(413, { error: 'Anfrage zu groß.' });
  }
  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(400, { error: 'Ungültiges JSON.' });
  }

  const mail = readMailConfig(deps.env);
  if (!mail.ok) {
    console.error(`[lead-alert] ${mail.problem}`);
    return jsonResponse(503, { error: 'Alert-Kanal nicht konfiguriert.' });
  }

  const formLabel = isLeadFormName(payload.form_name) ? LEAD_FORM_LABEL[payload.form_name] : 'Unbekanntes Formular';
  const rows: Array<[string, string]> = [
    ['Formular', formLabel],
    ['Route', clean(payload.source_path) || 'unbekannt'],
    ['Zeitpunkt', clean(payload.occurred_at, 64) || deps.now().toISOString()],
    ['Lead-E-Mail', clean(payload.lead_email, 254).toLowerCase() || 'nicht angegeben'],
    ['Seiten-URL', clean(payload.page_url) || 'unbekannt'],
    ['User-Agent', clean(payload.user_agent) || 'unbekannt'],
    ['Fehler', clean(payload.error_message, 1000) || 'unbekannter Fehler'],
  ];
  const formEntries = toSafeEntries(payload.form_data);

  const html = [
    '<p><strong>Lead-Funnel Alert:</strong> Formularübermittlung fehlgeschlagen</p>',
    `<ul>${rows.map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`).join('')}</ul>`,
    formEntries.length > 0
      ? `<p><strong>Formulardaten (Ausschnitt)</strong></p><ul>${formEntries
          .map(([key, value]) => `<li>${escapeHtml(key)}: ${escapeHtml(value)}</li>`)
          .join('')}</ul>`
      : '<p>Keine zusätzlichen Felder übermittelt.</p>',
    '<p>Bitte Funnel prüfen (Cloudflare Pages Functions-Logs, R2-Bucket leads/, Browser-Konsole).</p>',
  ].join('\n');
  const text = [
    'Lead-Funnel Alert: Formularübermittlung fehlgeschlagen',
    '',
    ...rows.map(([key, value]) => `${key}: ${value}`),
    ...(formEntries.length > 0 ? ['', 'Formulardaten (Ausschnitt):', ...formEntries.map(([k, v]) => `${k}: ${v}`)] : []),
  ].join('\n');

  try {
    await deps.sendMail(
      { from: mail.value.from, to: mail.value.to, subject: `[ALERT] Formularfehler (${formLabel})`, html, text },
      mail.value.resendApiKey,
      `lead-alert-${deps.newId()}`,
    );
  } catch (error) {
    console.error(`[lead-alert] Alert mail failed: ${String(error)}`);
    return jsonResponse(502, { error: 'Lead-Alert konnte nicht versendet werden.' });
  }
  return jsonResponse(200, { queued: true });
}
