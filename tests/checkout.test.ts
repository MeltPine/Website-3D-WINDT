import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import {
  buildCheckoutSessionParams,
  handleCreateCheckout,
  type CheckoutDeps,
  type CheckoutStripeClient,
} from '../server/checkout';
import { handleVerifyPaymentLink } from '../server/verifyLink';
import { createPaymentLinkQuery } from '../server/paymentLink.mjs';
import { FIXED_PRICE_PRODUCTS, KLEINUNTERNEHMER_NOTICE } from '../src/lib/payment/catalog';

const SITE = 'https://3d-windt.de';
const NOW = 1_790_000_000;
const LINK_SECRET = 'link-secret-with-at-least-32-characters';

const BASE_ENV = {
  SITE_URL: SITE,
  STRIPE_SECRET_KEY: 'sk_test_abc123',
  STRIPE_PRICE_ERSATZTEIL_CHECK: 'price_check490',
  PAYMENT_LINK_SECRET: LINK_SECRET,
};

function fakeStripe(overrides: Partial<CheckoutStripeClient> = {}) {
  const createSession = vi.fn(async (params: Stripe.Checkout.SessionCreateParams) => {
    void params;
    return { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' };
  });
  const client: CheckoutStripeClient = {
    retrievePrice: vi.fn(async () => ({ active: true, currency: 'eur', unit_amount: 49_000, type: 'one_time' as const })),
    retrieveTaxRate: vi.fn(async () => ({ active: true, percentage: 19, inclusive: false })),
    createSession,
    ...overrides,
  };
  return { client, createSession: (overrides.createSession as typeof createSession | undefined) ?? createSession };
}

function deps(env: Record<string, string | undefined>, client: CheckoutStripeClient): CheckoutDeps {
  return { env, nowSeconds: () => NOW, stripeFor: () => client };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}/api/checkout`, {
    method: 'POST',
    headers: { Origin: SITE, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function quoteLink(amountCents = 250_000) {
  const query = createPaymentLinkQuery(
    { quoteNumber: 'AB-2026-001', amountCents, expiresAt: NOW + 3600 },
    LINK_SECRET,
    NOW,
  );
  return Object.fromEntries(new URLSearchParams(query));
}

describe('create-checkout: tax mode fails closed', () => {
  it.each([undefined, '', 'KLEINUNTERNEHMER', 'regel', 'none'])('refuses checkout for TAX_MODE=%s', async (mode) => {
    const { client, createSession } = fakeStripe();
    const response = await handleCreateCheckout(
      post({ product: 'ersatzteil-check', b2b: true }),
      deps({ ...BASE_ENV, TAX_MODE: mode }, client),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/derzeit nicht verfügbar/);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuses regelbesteuerung without a tax rate id', async () => {
    const { client, createSession } = fakeStripe();
    const response = await handleCreateCheckout(
      post({ product: 'ersatzteil-check', b2b: true }),
      deps({ ...BASE_ENV, TAX_MODE: 'regelbesteuerung' }, client),
    );
    expect(response.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuses a tax rate that is not an exclusive 19 % rate', async () => {
    const { client, createSession } = fakeStripe({
      retrieveTaxRate: async () => ({ active: true, percentage: 19, inclusive: true }),
    });
    const response = await handleCreateCheckout(
      post({ product: 'ersatzteil-check', b2b: true }),
      deps({ ...BASE_ENV, TAX_MODE: 'regelbesteuerung', STRIPE_TAX_RATE_19: 'txr_19' }, client),
    );
    expect(response.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('verify endpoint also refuses when TAX_MODE is unset', async () => {
    const query = new URLSearchParams(quoteLink()).toString();
    const response = handleVerifyPaymentLink(new Request(`${SITE}/api/payment-link?${query}`), {
      env: { ...BASE_ENV },
      nowSeconds: () => NOW,
    });
    expect(response.status).toBe(503);
  });
});

describe('create-checkout: allowlist and request guards', () => {
  const env = { ...BASE_ENV, TAX_MODE: 'kleinunternehmer' };

  it.each(['unknown', 'toString', '__proto__', 'constructor', 42, null])('rejects product %s', async (product) => {
    const { client, createSession } = fakeStripe();
    const response = await handleCreateCheckout(post({ product, b2b: true }), deps(env, client));
    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('ignores client-supplied amounts and uses the configured price', async () => {
    const { client, createSession } = fakeStripe();
    const response = await handleCreateCheckout(
      post({ product: 'ersatzteil-check', b2b: true, amount: 1, unit_amount: 1, price: 'price_evil' }),
      deps(env, client),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const params = createSession.mock.calls[0][0];
    expect(params.line_items).toEqual([{ price: 'price_check490', quantity: 1, tax_rates: undefined }]);
  });

  it('refuses when the Stripe price does not match the catalog amount', async () => {
    const { client, createSession } = fakeStripe({
      retrievePrice: async () => ({ active: true, currency: 'eur', unit_amount: 4_900, type: 'one_time' as const }),
    });
    const response = await handleCreateCheckout(post({ product: 'ersatzteil-check', b2b: true }), deps(env, client));
    expect(response.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('requires the B2B declaration', async () => {
    const { client } = fakeStripe();
    for (const b2b of [undefined, false, 'true', 1]) {
      const response = await handleCreateCheckout(post({ product: 'ersatzteil-check', b2b }), deps(env, client));
      expect(response.status).toBe(400);
    }
  });

  it('rejects cross-origin, non-JSON and non-POST requests', async () => {
    const { client } = fakeStripe();
    const d = deps(env, client);
    const body = { product: 'ersatzteil-check', b2b: true };
    expect((await handleCreateCheckout(post(body, { Origin: 'https://evil.example' }), d)).status).toBe(403);
    expect((await handleCreateCheckout(post(body, { 'Content-Type': 'text/plain' }), d)).status).toBe(403);
    expect((await handleCreateCheckout(new Request(`${SITE}/api/checkout`), d)).status).toBe(405);
  });

  it('only accepts quote payments with an authentic link', async () => {
    const { client, createSession } = fakeStripe();
    const tampered = { ...quoteLink(), a: '100' };
    const response = await handleCreateCheckout(post({ product: 'quote', b2b: true, link: tampered }), deps(env, client));
    expect(response.status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();

    const ok = await handleCreateCheckout(post({ product: 'quote', b2b: true, link: quoteLink() }), deps(env, client));
    expect(ok.status).toBe(200);
    const params = createSession.mock.calls[0][0];
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(250_000);
    expect(params.metadata?.quote_number).toBe('AB-2026-001');
  });

  it('answers 410 for an expired quote link', async () => {
    const { client } = fakeStripe();
    const response = await handleCreateCheckout(
      post({ product: 'quote', b2b: true, link: quoteLink() }),
      { env, nowSeconds: () => NOW + 3600, stripeFor: () => client },
    );
    expect(response.status).toBe(410);
  });
});

describe('checkout session parameters', () => {
  const product = FIXED_PRICE_PRODUCTS['ersatzteil-check'];

  it('kleinunternehmer: no tax rates, § 19 notice on the invoice', () => {
    const params = buildCheckoutSessionParams(
      { kind: 'fixed', product, priceId: 'price_x' },
      { mode: 'kleinunternehmer', taxRateId: null },
      SITE,
    );
    expect(params.line_items?.[0].tax_rates).toBeUndefined();
    expect(params.invoice_creation?.enabled).toBe(true);
    expect(params.invoice_creation?.invoice_data?.footer).toBe(KLEINUNTERNEHMER_NOTICE);
    expect(params.invoice_creation?.invoice_data?.custom_fields).toContainEqual({
      name: 'Steuerhinweis',
      value: KLEINUNTERNEHMER_NOTICE,
    });
    expect(params.tax_id_collection).toEqual({ enabled: true, required: 'never' });
    expect(params.name_collection?.business).toEqual({ enabled: true, optional: false });
    expect(params.billing_address_collection).toBe('required');
    expect(params.payment_method_types).toBeUndefined();
    expect(params.success_url).toBe(`${SITE}/zahlung-erfolgreich/`);
    expect(params.cancel_url).toBe(`${SITE}/zahlung-abgebrochen/`);
  });

  it('regelbesteuerung: 19 % tax rate on the line item, no § 19 notice', () => {
    const params = buildCheckoutSessionParams(
      { kind: 'quote', link: { quoteNumber: 'AB-2026-001', amountCents: 10_000, expiresAt: NOW + 10 } },
      { mode: 'regelbesteuerung', taxRateId: 'txr_19' },
      SITE,
    );
    expect(params.line_items?.[0].tax_rates).toEqual(['txr_19']);
    expect(params.invoice_creation?.invoice_data?.footer).toBeUndefined();
    expect(params.invoice_creation?.invoice_data?.custom_fields).toEqual([{ name: 'Angebot', value: 'AB-2026-001' }]);
  });
});
