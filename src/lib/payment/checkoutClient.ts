export const CHECKOUT_ENDPOINT = '/api/checkout';
export const PAYMENT_LINK_ENDPOINT = '/api/payment-link';
const STRIPE_CHECKOUT_ORIGIN = 'https://checkout.stripe.com';

export type QuoteLinkParams = { q: string; a: string; e: string; s: string };

/** What the buyer selected; the B2B declaration is added by `startCheckout`. */
export type CheckoutSelection = { product: string } | { product: 'quote'; link: QuoteLinkParams };

const GENERIC_ERROR =
  'Die Zahlungsseite konnte nicht geöffnet werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns.';

function errorFrom(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const message = (payload as { error: unknown }).error;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }
  return GENERIC_ERROR;
}

/**
 * Asks our Function for a Stripe Checkout Session and navigates there. The
 * browser only sends a product key (or the signed quote link) plus the B2B
 * declaration the buyer ticked; amounts are decided server-side. Resolves with
 * an error message if no redirect happened, with '' otherwise.
 */
export async function startCheckout(selection: CheckoutSelection): Promise<string> {
  let response: Response;
  try {
    response = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selection, b2b: true }),
      credentials: 'same-origin',
    });
  } catch {
    return 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.';
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return GENERIC_ERROR;
  }
  if (!response.ok) {
    return errorFrom(payload);
  }
  const url = typeof payload === 'object' && payload !== null ? (payload as { url?: unknown }).url : null;
  if (typeof url !== 'string' || !url.startsWith(`${STRIPE_CHECKOUT_ORIGIN}/`)) {
    return GENERIC_ERROR;
  }
  window.location.assign(url);
  return '';
}

export interface VerifiedQuoteLink {
  quoteNumber: string;
  netAmountCents: number;
  vatCents: number;
  totalCents: number;
  taxMode: 'kleinunternehmer' | 'regelbesteuerung';
  expiresAt: number;
}

export type QuoteLinkResult = { ok: true; quote: VerifiedQuoteLink } | { ok: false; error: string };

function isVerifiedQuote(value: unknown): value is VerifiedQuoteLink {
  const candidate = value as Partial<VerifiedQuoteLink> | null;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.quoteNumber === 'string' &&
    typeof candidate.netAmountCents === 'number' &&
    typeof candidate.vatCents === 'number' &&
    typeof candidate.totalCents === 'number' &&
    (candidate.taxMode === 'kleinunternehmer' || candidate.taxMode === 'regelbesteuerung') &&
    typeof candidate.expiresAt === 'number'
  );
}

export async function verifyQuoteLink(link: QuoteLinkParams): Promise<QuoteLinkResult> {
  const query = new URLSearchParams(link).toString();
  let response: Response;
  try {
    response = await fetch(`${PAYMENT_LINK_ENDPOINT}?${query}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, error: 'Keine Verbindung. Bitte laden Sie die Seite erneut.' };
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
  if (!response.ok) {
    return { ok: false, error: errorFrom(payload) };
  }
  return isVerifiedQuote(payload) ? { ok: true, quote: payload } : { ok: false, error: GENERIC_ERROR };
}
