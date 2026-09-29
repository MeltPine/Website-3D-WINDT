import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';
import { EVENT_MARKER_TTL_SECONDS, STALE_CLAIM_MS, createKvEventStore } from '../server/stripeEventStore';
import { handleStripeWebhook, type MailMessage, type WebhookDeps } from '../server/stripeWebhook';
import { MemoryKV } from './helpers/cloudflare';

const WEBHOOK_SECRET = 'whsec_test_secret_value';
const ENV = {
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  RESEND_API_KEY: 're_test',
  LEAD_ALERT_FROM: '3D-WINDT Alert <alerts@3d-windt.de>',
  LEAD_SALES_EMAIL: 'support@3d-windt.de',
};
const cryptoProvider = Stripe.createSubtleCryptoProvider();

function sessionEvent(id: string, type = 'checkout.session.completed', paymentStatus = 'paid') {
  return {
    id,
    object: 'event',
    type,
    livemode: false,
    created: 1_790_000_000,
    data: {
      object: {
        id: 'cs_test_123',
        object: 'checkout.session',
        amount_total: 49_000,
        amount_subtotal: 49_000,
        currency: 'eur',
        payment_status: paymentStatus,
        payment_intent: 'pi_test_123',
        invoice: 'in_test_123',
        total_details: { amount_tax: 0 },
        metadata: { product: 'ersatzteil-check', tax_mode: 'kleinunternehmer', b2b_declared: 'true' },
        collected_information: { business_name: 'Muster <GmbH>', individual_name: null, shipping_details: null },
        customer_details: {
          name: 'Erika Muster',
          email: 'einkauf@muster.example',
          business_name: 'Muster <GmbH>',
          address: { line1: 'Weg 1', line2: null, postal_code: '63110', city: 'Rodgau', state: null, country: 'DE' },
          tax_ids: [{ type: 'eu_vat', value: 'DE123456789' }],
        },
      },
    },
  };
}

function signedRequest(payload: string, secret = WEBHOOK_SECRET): Request {
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('https://3d-windt.de/api/stripe/webhook', {
    method: 'POST',
    headers: { 'Stripe-Signature': header, 'Content-Type': 'application/json' },
    body: payload,
  });
}

let blobs: MemoryKV;
let sendMail: ReturnType<typeof vi.fn<(message: MailMessage, apiKey: string, key: string) => Promise<void>>>;
let now: number;

function deps(overrides: Partial<WebhookDeps> = {}): WebhookDeps {
  return {
    env: ENV,
    store: createKvEventStore(blobs),
    constructEvent: (raw, signature, secret) =>
      Stripe.webhooks.constructEventAsync(raw, signature, secret, undefined, cryptoProvider),
    sendMail,
    nowMs: () => now,
    ...overrides,
  };
}

beforeEach(() => {
  blobs = new MemoryKV();
  sendMail = vi.fn(async () => undefined);
  now = Date.now();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('stripe-webhook signature verification', () => {
  it('rejects a request without signature header', async () => {
    const request = new Request('https://3d-windt.de/api/stripe/webhook', {
      method: 'POST',
      body: JSON.stringify(sessionEvent('evt_1')),
    });
    expect((await handleStripeWebhook(request, deps())).status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rejects a payload signed with another secret', async () => {
    const response = await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_1')), 'whsec_attacker'),
      deps(),
    );
    expect(response.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
    expect(blobs.entries.size).toBe(0);
  });

  it('rejects a body modified after signing', async () => {
    const payload = JSON.stringify(sessionEvent('evt_1'));
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const tampered = payload.replace('49000', '1');
    const request = new Request('https://3d-windt.de/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Stripe-Signature': header },
      body: tampered,
    });
    expect((await handleStripeWebhook(request, deps())).status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rejects a replayed signature outside the tolerance window', async () => {
    const payload = JSON.stringify(sessionEvent('evt_1'));
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: WEBHOOK_SECRET,
      timestamp: Math.floor(Date.now() / 1000) - 3600,
    });
    const request = new Request('https://3d-windt.de/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Stripe-Signature': header },
      body: payload,
    });
    expect((await handleStripeWebhook(request, deps())).status).toBe(400);
  });

  it('answers 500 (so Stripe retries) when the webhook secret is not configured', async () => {
    const response = await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_1'))),
      deps({ env: { ...ENV, STRIPE_WEBHOOK_SECRET: undefined } }),
    );
    expect(response.status).toBe(500);
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('stripe-webhook processing and idempotency', () => {
  it('sends exactly one notification for repeated deliveries of one event', async () => {
    const payload = JSON.stringify(sessionEvent('evt_dup'));
    const first = await handleStripeWebhook(signedRequest(payload), deps());
    const second = await handleStripeWebhook(signedRequest(payload), deps());
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][2]).toBe('stripe-event-evt_dup');
  });

  it('builds an escaped notification with customer, product, amount and dashboard link', async () => {
    await handleStripeWebhook(signedRequest(JSON.stringify(sessionEvent('evt_mail'))), deps());
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('support@3d-windt.de');
    expect(message.subject.replace(/\u00a0/g, ' ')).toBe(
      '[TEST] Zahlung eingegangen: Ersatzteil- und Vorrichtungs-Check vor Ort (490,00 €)',
    );
    expect(message.html).toContain('Muster &lt;GmbH&gt;');
    expect(message.html).not.toContain('<GmbH>');
    expect(message.text).toContain('DE123456789');
    expect(message.text).toContain('https://dashboard.stripe.com/test/payments/pi_test_123');
  });

  it('labels pending SEPA payments and async failures', async () => {
    await handleStripeWebhook(signedRequest(JSON.stringify(sessionEvent('evt_a', 'checkout.session.completed', 'unpaid'))), deps());
    await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_b', 'checkout.session.async_payment_failed', 'unpaid'))),
      deps(),
    );
    await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_c', 'checkout.session.async_payment_succeeded'))),
      deps(),
    );
    const subjects = sendMail.mock.calls.map((call) => call[0].subject);
    expect(subjects[0]).toMatch(/Zahlung ausstehend/);
    expect(subjects[1]).toMatch(/Zahlung fehlgeschlagen/);
    expect(subjects[2]).toMatch(/Zahlung bestätigt/);
  });

  it('ignores unrelated event types without sending mail', async () => {
    const response = await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_other', 'customer.created'))),
      deps(),
    );
    expect(response.status).toBe(200);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('releases the claim when the mail fails so the Stripe retry succeeds', async () => {
    const payload = JSON.stringify(sessionEvent('evt_retry'));
    sendMail.mockRejectedValueOnce(new Error('Resend down'));
    expect((await handleStripeWebhook(signedRequest(payload), deps())).status).toBe(500);
    expect((await handleStripeWebhook(signedRequest(payload), deps())).status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect((await handleStripeWebhook(signedRequest(payload), deps())).status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('answers 409 while another delivery holds a fresh claim, takes over a stale one', async () => {
    const store = createKvEventStore(blobs);
    expect(await store.claim('evt_race', 'checkout.session.completed', now)).toBe('claimed');

    const payload = JSON.stringify(sessionEvent('evt_race'));
    expect((await handleStripeWebhook(signedRequest(payload), deps())).status).toBe(409);
    expect(sendMail).not.toHaveBeenCalled();

    now += STALE_CLAIM_MS;
    expect((await handleStripeWebhook(signedRequest(payload), deps())).status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('does not claim the event when mail is not configured', async () => {
    const response = await handleStripeWebhook(
      signedRequest(JSON.stringify(sessionEvent('evt_nomail'))),
      deps({ env: { ...ENV, RESEND_API_KEY: undefined } }),
    );
    expect(response.status).toBe(500);
    expect(blobs.entries.size).toBe(0);
  });
});

describe('KV event markers', () => {
  it('stores only id, type and timestamps with a TTL beyond Stripe retries', async () => {
    await handleStripeWebhook(signedRequest(JSON.stringify(sessionEvent('evt_ttl'))), deps());
    const entry = blobs.entries.get('stripe-event:evt_ttl');
    expect(entry?.expirationTtl).toBe(EVENT_MARKER_TTL_SECONDS);
    expect(EVENT_MARKER_TTL_SECONDS).toBeGreaterThan(3 * 86_400);
    expect(JSON.parse(entry!.value)).toEqual({ status: 'done', type: 'checkout.session.completed', updatedAt: now });
  });

  it('answers 500 (Stripe retries) when KV is unavailable', async () => {
    blobs.failAll = true;
    const response = await handleStripeWebhook(signedRequest(JSON.stringify(sessionEvent('evt_kv'))), deps());
    expect(response.status).toBe(500);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rejects malformed event ids before touching KV', async () => {
    const store = createKvEventStore(blobs);
    await expect(store.claim('evt_../x', 'checkout.session.completed', now)).rejects.toThrow();
  });
});
