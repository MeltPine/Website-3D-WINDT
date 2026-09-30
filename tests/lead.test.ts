import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleLead, leadObjectKey, type LeadDeps, type LeadRecord } from '../server/lead';
import { handleLeadAlert, type LeadAlertDeps } from '../server/leadAlert';
import type { MailMessage } from '../server/resend';
import { downloadExpiry, downloadPath } from '../server/uploadCore';
import { MemoryKV, MemoryR2 } from './helpers/cloudflare';

const SITE = 'https://3d-windt.de';
const NOW = new Date('2026-09-30T10:00:00Z');
const ENV = {
  RESEND_API_KEY: 're_test',
  LEAD_REPLY_FROM: '3D-WINDT <noreply@3d-windt.de>',
  LEAD_ALERT_FROM: '3D-WINDT Alert <alerts@3d-windt.de>',
  LEAD_SALES_EMAIL: 'support@3d-windt.de',
  SITE_URL: SITE,
};

const CONTACT = {
  'form-name': 'contact-request',
  name: 'Erika Muster',
  email: 'Einkauf@Muster.example',
  company: 'Muster <GmbH>',
  role_in_company: 'Instandhaltung',
  use_case: 'ersatzteil',
  message: 'Halter gebrochen',
  business_intent: 'on',
  privacy_consent: 'on',
  source_path: '/kontakt/',
  'bot-field': '',
};

let bucket: MemoryR2;
let kv: MemoryKV;
let sendMail: ReturnType<typeof vi.fn<(message: MailMessage, apiKey: string, key: string) => Promise<void>>>;
let ids: number;

function deps(overrides: Partial<LeadDeps> = {}): LeadDeps {
  return {
    env: ENV,
    bucket,
    kv,
    sendMail,
    now: () => NOW,
    newId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, '0')}`,
    ...overrides,
  };
}

function jsonLead(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}/api/lead`, {
    method: 'POST',
    headers: { Origin: SITE, 'Content-Type': 'application/json', 'cf-connecting-ip': '198.51.100.4', ...headers },
    body: JSON.stringify(body),
  });
}

function storedLeads(): LeadRecord[] {
  return [...bucket.objects.entries()]
    .filter(([key]) => key.startsWith('leads/'))
    .map(([, object]) => JSON.parse(new TextDecoder().decode(object.data)) as LeadRecord);
}

beforeEach(() => {
  bucket = new MemoryR2();
  kv = new MemoryKV();
  sendMail = vi.fn(async () => undefined);
  ids = 0;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST /api/lead', () => {
  it('stores the lead in R2 under leads/YYYY/MM and notifies sales + customer', async () => {
    const response = await handleLead(jsonLead(CONTACT), deps());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; id: string; notified: boolean };
    expect(body).toMatchObject({ ok: true, notified: true });

    const key = leadObjectKey(body.id, NOW);
    expect(key).toBe(`leads/2026/09/${body.id}.json`);
    expect(bucket.objects.has(key)).toBe(true);
    const [record] = storedLeads();
    expect(record.form).toBe('contact-request');
    expect(record.fields.email).toBe('einkauf@muster.example');
    expect(record.fields).not.toHaveProperty('bot-field');
    expect(record.fields).not.toHaveProperty('form-name');

    expect(sendMail).toHaveBeenCalledTimes(2);
    const [sales, customer] = sendMail.mock.calls.map((call) => call[0]);
    expect(sales.to).toBe('support@3d-windt.de');
    expect(sales.replyTo).toBe('einkauf@muster.example');
    expect(sales.html).toContain('Muster &lt;GmbH&gt;');
    expect(sales.html).toContain(key);
    expect(customer.to).toBe('einkauf@muster.example');
    expect(sendMail.mock.calls.map((call) => call[2])).toEqual([`lead-${body.id}-sales`, `lead-${body.id}-customer`]);
  });

  it('stores the printability summary and shows it escaped in the sales mail', async () => {
    const summary = 'halter.stl [SHA-256 abcdef012345]: Druckbarkeit <b>mit Anpassungen</b>\nKritisch: Wandstärke';
    const response = await handleLead(
      jsonLead({
        ...CONTACT,
        'form-name': 'project-request',
        printcheck_summary: summary,
        printcheck_request: 'Kostenlose technische Prüfung angefordert',
      }),
      deps(),
    );
    expect(response.status).toBe(200);
    const [record] = storedLeads();
    expect(record.fields.printcheck_summary).toBe(summary);
    expect(record.fields.printcheck_request).toBe('Kostenlose technische Prüfung angefordert');
    const sales = sendMail.mock.calls[0][0];
    expect(sales.html).toContain('Druckbarkeits-Check (automatische Vorprüfung)');
    expect(sales.html).toContain('&lt;b&gt;mit Anpassungen&lt;/b&gt;<br />Kritisch');
    expect(sales.html).not.toContain('<b>mit');
    expect(sales.text).toContain('Anliegen (Druckbarkeits-Check): Kostenlose technische Prüfung angefordert');
  });

  it('keeps the lead and reports success when Resend fails', async () => {
    sendMail.mockRejectedValue(new Error('Resend down'));
    const response = await handleLead(jsonLead(CONTACT), deps());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, notified: false });
    expect(storedLeads()).toHaveLength(1);
  });

  it('keeps the lead when mail is not configured', async () => {
    const response = await handleLead(jsonLead(CONTACT), deps({ env: { SITE_URL: SITE } }));
    expect(await response.json()).toMatchObject({ ok: true, notified: false });
    expect(storedLeads()).toHaveLength(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('fails without success when storage fails, and sends no mail', async () => {
    bucket.failPuts = true;
    const response = await handleLead(jsonLead(CONTACT), deps());
    expect(response.status).toBe(502);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('accepts form-encoded bodies and redirects native form posts to the thank-you page', async () => {
    const body = new URLSearchParams({ ...CONTACT, 'form-name': 'project-request' }).toString();
    const request = new Request(`${SITE}/api/lead`, {
      method: 'POST',
      headers: {
        Origin: SITE,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,application/xhtml+xml',
      },
      body,
    });
    const response = await handleLead(request, deps());
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/danke-projekt/');
    expect(storedLeads()[0].form).toBe('project-request');
  });

  it('silently drops honeypot submissions', async () => {
    const response = await handleLead(jsonLead({ ...CONTACT, 'bot-field': 'http://spam.example' }), deps());
    expect(response.status).toBe(200);
    expect(storedLeads()).toHaveLength(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('validates form name, required fields and e-mail', async () => {
    expect((await handleLead(jsonLead({ ...CONTACT, 'form-name': 'other' }), deps())).status).toBe(400);
    expect((await handleLead(jsonLead({ ...CONTACT, privacy_consent: '' }), deps())).status).toBe(400);
    expect((await handleLead(jsonLead({ ...CONTACT, email: 'not-an-address' }), deps())).status).toBe(400);
    expect((await handleLead(jsonLead([CONTACT]), deps())).status).toBe(400);
    expect(storedLeads()).toHaveLength(0);
  });

  it('refuses cross-origin posts, other methods, other content types and oversized bodies', async () => {
    expect((await handleLead(jsonLead(CONTACT, { Origin: 'https://evil.example' }), deps())).status).toBe(403);
    expect((await handleLead(new Request(`${SITE}/api/lead`), deps())).status).toBe(405);
    const multipart = new Request(`${SITE}/api/lead`, {
      method: 'POST',
      headers: { Origin: SITE, 'Content-Type': 'multipart/form-data; boundary=x' },
      body: '--x--',
    });
    expect((await handleLead(multipart, deps())).status).toBe(415);
    const huge = jsonLead({ ...CONTACT, message: 'x'.repeat(70 * 1024) });
    expect((await handleLead(huge, deps())).status).toBe(413);
  });

  it('truncates overlong fields instead of losing the lead', async () => {
    await handleLead(jsonLead({ ...CONTACT, message: 'y'.repeat(6000), unknown_field: 'dropped' }), deps());
    const [record] = storedLeads();
    expect(record.fields.message).toHaveLength(5000);
    expect(record.truncatedFields).toEqual(['message']);
    expect(record.fields).not.toHaveProperty('unknown_field');
  });

  it('keeps only signed retrieval links and renders them absolute in the sales mail', async () => {
    const path = downloadPath(
      {
        day: '2026-09-30',
        uid: '0b5c3a8e-1f2d-4c3b-9a8e-7d6c5b4a3f21',
        fid: '9f8e7d6c-5b4a-4c3b-8a1f-0e1d2c3b4a59',
        exp: downloadExpiry('2026-09-30'),
      },
      's'.repeat(48),
    );
    await handleLead(
      jsonLead({
        ...CONTACT,
        'form-name': 'project-request',
        file_links: [
          { name: 'halter.step', size: 2048, path },
          { name: 'phish', size: 1, path: 'https://evil.example/' },
        ],
      }),
      deps(),
    );
    expect(storedLeads()[0].fileLinks).toEqual([{ name: 'halter.step', size: 2048, path }]);
    const sales = sendMail.mock.calls[0][0];
    expect(sales.html).toContain(`${SITE}${path}`.replace(/&/g, '&amp;'));
    expect(sales.html).not.toContain('evil.example');
  });

  it('rate-limits per client and fails open when KV is down', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await handleLead(jsonLead(CONTACT), deps())).status).toBe(200);
    }
    expect((await handleLead(jsonLead(CONTACT), deps())).status).toBe(429);
    expect((await handleLead(jsonLead(CONTACT, { 'cf-connecting-ip': '198.51.100.99' }), deps())).status).toBe(200);

    kv.failAll = true;
    expect((await handleLead(jsonLead(CONTACT), deps())).status).toBe(200);
    expect([...kv.entries.keys()].some((key) => key.includes('198.51.100.4'))).toBe(false);
  });
});

describe('POST /api/lead-alert', () => {
  function alertDeps(overrides: Partial<LeadAlertDeps> = {}): LeadAlertDeps {
    return { env: ENV, kv, sendMail, now: () => NOW, newId: () => 'alert-1', ...overrides };
  }

  function alertRequest(body: unknown, headers: Record<string, string> = {}) {
    return new Request(`${SITE}/api/lead-alert`, {
      method: 'POST',
      headers: { Origin: SITE, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }

  it('mails only the configured sales address, escaped', async () => {
    const response = await handleLeadAlert(
      alertRequest({
        form_name: 'project-request',
        error_message: '<script>x</script>',
        lead_email: 'a@b.example',
        form_data: { file_count: 2 },
      }),
      alertDeps(),
    );
    expect(response.status).toBe(200);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('support@3d-windt.de');
    expect(message.from).toBe('3D-WINDT Alert <alerts@3d-windt.de>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.subject).toBe('[ALERT] Formularfehler (Projektformular)');
  });

  it('refuses cross-origin and non-JSON requests (no CORS)', async () => {
    const cross = await handleLeadAlert(alertRequest({}, { Origin: 'https://evil.example' }), alertDeps());
    expect(cross.status).toBe(403);
    expect(cross.headers.get('access-control-allow-origin')).toBeNull();
    const form = await handleLeadAlert(alertRequest({}, { 'Content-Type': 'text/plain' }), alertDeps());
    expect(form.status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('answers 503 when mail is not configured', async () => {
    const response = await handleLeadAlert(alertRequest({ form_name: 'contact-request' }), alertDeps({ env: {} }));
    expect(response.status).toBe(503);
  });
});

describe('rate-limit key lifetime (privacy page promises at most 15 minutes)', () => {
  it('keeps every counter shorter than 15 minutes', async () => {
    const { RATE_LIMITS } = await import('../server/rateLimit');
    for (const rule of Object.values(RATE_LIMITS)) {
      expect(rule.windowSeconds + 60).toBeLessThanOrEqual(15 * 60);
      expect(rule.windowSeconds).toBeGreaterThanOrEqual(60);
    }
  });
});

describe('rate-limit counters', () => {
  it('expire 60 s after their window regardless of later writes', async () => {
    const { enforceRateLimit, RATE_LIMITS } = await import('../server/rateLimit');
    const store = new MemoryKV();
    const request = new Request(`${SITE}/api/lead`, { headers: { 'cf-connecting-ip': '192.0.2.1' } });
    const windowStart = Math.floor(NOW.getTime() / 1000 / 600) * 600 * 1000;
    await enforceRateLimit(store, RATE_LIMITS.lead, request, windowStart + 599_000);
    const [entry] = [...store.entries.values()];
    expect(entry.expirationTtl).toBe(61);
    expect(entry.value).toBe('1');
  });
});
