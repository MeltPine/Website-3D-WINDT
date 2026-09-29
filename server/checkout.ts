import type Stripe from 'stripe';
import {
  KLEINUNTERNEHMER_NOTICE,
  VAT_RATE_PERCENT,
  findFixedPriceProduct,
  type FixedPriceProduct,
} from '../src/lib/payment/catalog';
import {
  readPaymentLinkSecret,
  readSiteOrigin,
  readStripePriceId,
  readStripeSecretKey,
  readTaxConfig,
  type Env,
  type TaxConfig,
} from './paymentConfig';
import { PAYMENTS_UNAVAILABLE, isSameOriginJsonPost, json, readLimitedText } from './paymentHttp';
import { verifyPaymentLink, type PaymentLink } from './paymentLink.mjs';
import { linkFailureMessage } from './paymentLinkMessages';

export const QUOTE_PRODUCT_KEY = 'quote';
export const SUCCESS_PATH = '/zahlung-erfolgreich/';
export const CANCEL_PATH = '/zahlung-abgebrochen/';
const MAX_BODY_BYTES = 4 * 1024;

export type CheckoutItem =
  | { kind: 'fixed'; product: FixedPriceProduct; priceId: string }
  | { kind: 'quote'; link: PaymentLink };

/** Narrow slice of the Stripe client, so tests can substitute it. */
export interface CheckoutStripeClient {
  retrievePrice(id: string): Promise<Pick<Stripe.Price, 'active' | 'currency' | 'unit_amount' | 'type'>>;
  retrieveTaxRate(
    id: string,
  ): Promise<Pick<Stripe.TaxRate, 'active' | 'percentage' | 'inclusive'>>;
  createSession(params: Stripe.Checkout.SessionCreateParams): Promise<{ id: string; url: string | null }>;
}

export interface CheckoutDeps {
  env: Env;
  nowSeconds: () => number;
  stripeFor: (secretKey: string) => CheckoutStripeClient;
}

/**
 * Pure mapping from a validated item + tax configuration to the Stripe
 * Checkout Session request. Kept free of I/O so it can be asserted in tests.
 */
export function buildCheckoutSessionParams(
  item: CheckoutItem,
  tax: TaxConfig,
  siteOrigin: string,
): Stripe.Checkout.SessionCreateParams {
  const taxRates = tax.taxRateId ? [tax.taxRateId] : undefined;
  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem =
    item.kind === 'fixed'
      ? { price: item.priceId, quantity: 1, tax_rates: taxRates }
      : {
          quantity: 1,
          tax_rates: taxRates,
          price_data: {
            currency: 'eur',
            unit_amount: item.link.amountCents,
            product_data: {
              name: `Angebot ${item.link.quoteNumber}`,
              description: 'Zahlung gemäß angenommenem Angebot',
            },
          },
        };

  const productKey = item.kind === 'fixed' ? item.product.key : QUOTE_PRODUCT_KEY;
  const netAmountCents = item.kind === 'fixed' ? item.product.netAmountCents : item.link.amountCents;
  const metadata: Record<string, string> = {
    product: productKey,
    net_amount_cents: String(netAmountCents),
    tax_mode: tax.mode,
    b2b_declared: 'true',
  };
  if (item.kind === 'quote') {
    metadata.quote_number = item.link.quoteNumber;
  }

  const invoiceCustomFields: Stripe.Checkout.SessionCreateParams.InvoiceCreation.InvoiceData.CustomField[] =
    [];
  if (item.kind === 'quote') {
    invoiceCustomFields.push({ name: 'Angebot', value: item.link.quoteNumber });
  }
  if (tax.mode === 'kleinunternehmer') {
    invoiceCustomFields.push({ name: 'Steuerhinweis', value: KLEINUNTERNEHMER_NOTICE });
  }

  const description =
    item.kind === 'fixed'
      ? item.product.invoiceDescription
      : `Zahlung zum Angebot ${item.link.quoteNumber}.`;

  return {
    mode: 'payment',
    locale: 'de',
    submit_type: 'pay',
    client_reference_id: item.kind === 'quote' ? item.link.quoteNumber : productKey,
    line_items: [lineItem],
    // Payment methods are not listed here: Stripe uses the methods enabled in
    // the Dashboard (card, SEPA debit, Klarna, PayPal, ...).
    customer_creation: 'always',
    billing_address_collection: 'required',
    name_collection: { business: { enabled: true, optional: false } },
    tax_id_collection: { enabled: true, required: 'never' },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description,
        metadata,
        ...(invoiceCustomFields.length > 0 ? { custom_fields: invoiceCustomFields } : {}),
        ...(tax.mode === 'kleinunternehmer' ? { footer: KLEINUNTERNEHMER_NOTICE } : {}),
      },
    },
    custom_text: {
      submit: {
        message:
          'Bestellung ausschließlich für Unternehmer (§ 14 BGB). Rechnung und Zahlungsbeleg erhalten Sie per E-Mail.',
      },
    },
    metadata,
    payment_intent_data: { description, metadata },
    success_url: `${siteOrigin}${SUCCESS_PATH}`,
    cancel_url: `${siteOrigin}${CANCEL_PATH}`,
  };
}

interface CheckoutBody {
  product?: unknown;
  b2b?: unknown;
  link?: unknown;
}

function unavailable(problem: string): Response {
  console.error(`[create-checkout] ${problem}`);
  return json(503, { error: PAYMENTS_UNAVAILABLE });
}

async function assertStripeSetup(
  stripe: CheckoutStripeClient,
  item: CheckoutItem,
  tax: TaxConfig,
): Promise<string | null> {
  const [price, taxRate] = await Promise.all([
    item.kind === 'fixed' ? stripe.retrievePrice(item.priceId) : Promise.resolve(null),
    tax.taxRateId ? stripe.retrieveTaxRate(tax.taxRateId) : Promise.resolve(null),
  ]);
  if (item.kind === 'fixed') {
    if (
      !price ||
      !price.active ||
      price.type !== 'one_time' ||
      price.currency !== 'eur' ||
      price.unit_amount !== item.product.netAmountCents
    ) {
      return `Stripe price for ${item.product.key} does not match the catalog (active, one_time, eur, ${item.product.netAmountCents} cents).`;
    }
  }
  if (tax.taxRateId) {
    if (!taxRate || !taxRate.active || taxRate.inclusive || taxRate.percentage !== VAT_RATE_PERCENT) {
      return `STRIPE_TAX_RATE_19 must be an active, exclusive ${VAT_RATE_PERCENT} % tax rate.`;
    }
  }
  return null;
}

export async function handleCreateCheckout(request: Request, deps: CheckoutDeps): Promise<Response> {
  if (!isSameOriginJsonPost(request)) {
    return json(request.method === 'POST' ? 403 : 405, { error: 'Anfrage nicht erlaubt.' });
  }
  const raw = await readLimitedText(request, MAX_BODY_BYTES);
  if (raw === null) {
    return json(413, { error: 'Anfrage zu groß.' });
  }
  let body: CheckoutBody;
  try {
    body = JSON.parse(raw) as CheckoutBody;
  } catch {
    return json(400, { error: 'Ungültige Anfrage.' });
  }
  if (typeof body !== 'object' || body === null) {
    return json(400, { error: 'Ungültige Anfrage.' });
  }
  if (body.b2b !== true) {
    return json(400, {
      error: 'Bitte bestätigen Sie, dass Sie als Unternehmer (§ 14 BGB) bestellen.',
    });
  }

  // Tax mode first: without it nothing may be sold (fail closed).
  const tax = readTaxConfig(deps.env);
  if (!tax.ok) {
    return unavailable(tax.problem);
  }
  const secretKey = readStripeSecretKey(deps.env);
  if (!secretKey.ok) {
    return unavailable(secretKey.problem);
  }
  const origin = readSiteOrigin(deps.env);
  if (!origin.ok) {
    return unavailable(origin.problem);
  }

  let item: CheckoutItem;
  if (body.product === QUOTE_PRODUCT_KEY) {
    const secret = readPaymentLinkSecret(deps.env);
    if (!secret.ok) {
      return unavailable(secret.problem);
    }
    const linkParams = (typeof body.link === 'object' && body.link !== null ? body.link : {}) as Record<
      string,
      unknown
    >;
    const verified = verifyPaymentLink(
      { q: linkParams.q, a: linkParams.a, e: linkParams.e, s: linkParams.s },
      secret.value,
      deps.nowSeconds(),
    );
    if (!verified.ok) {
      return json(verified.reason === 'expired' ? 410 : 400, { error: linkFailureMessage(verified.reason) });
    }
    item = { kind: 'quote', link: verified.link };
  } else {
    const product = findFixedPriceProduct(body.product);
    if (!product) {
      return json(400, { error: 'Unbekanntes Produkt.' });
    }
    const priceId = readStripePriceId(deps.env, product.priceEnvVar);
    if (!priceId.ok) {
      return unavailable(priceId.problem);
    }
    item = { kind: 'fixed', product, priceId: priceId.value };
  }

  const stripe = deps.stripeFor(secretKey.value);
  try {
    const setupProblem = await assertStripeSetup(stripe, item, tax.value);
    if (setupProblem) {
      return unavailable(setupProblem);
    }
    const session = await stripe.createSession(buildCheckoutSessionParams(item, tax.value, origin.value));
    if (!session.url || !session.url.startsWith('https://checkout.stripe.com/')) {
      return unavailable(`Stripe returned no hosted checkout URL for session ${session.id}.`);
    }
    return json(200, { url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[create-checkout] Stripe request failed: ${message}`);
    return json(502, {
      error: 'Die Zahlungsseite konnte gerade nicht geöffnet werden. Bitte versuchen Sie es in einigen Minuten erneut.',
    });
  }
}
