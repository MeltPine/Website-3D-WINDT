import { Buffer } from 'node:buffer';
import type Stripe from 'stripe';
import { findFixedPriceProduct, formatEuroCents } from '../src/lib/payment/catalog';
import type { Env } from './env';
import { readMailConfig, type MailConfig } from './mailConfig';
import { escapeHtml, type MailMessage, type SendMail } from './resend';

export type { MailMessage };
import { readWebhookSecret } from './paymentConfig';
import { json } from './paymentHttp';

export const HANDLED_EVENT_TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
] as const;
type HandledEventType = (typeof HANDLED_EVENT_TYPES)[number];

/** Stripe events are far below this; anything larger is not from Stripe. */
const MAX_BODY_BYTES = 512 * 1024;

export type ClaimResult = 'claimed' | 'done' | 'in_progress';

/**
 * Remembers processed Stripe event IDs so retried deliveries do not send a
 * second notification. Stores only event id, type and timestamps.
 */
export interface ProcessedEventStore {
  claim(eventId: string, eventType: string, nowMs: number): Promise<ClaimResult>;
  complete(eventId: string, eventType: string, nowMs: number): Promise<void>;
  release(eventId: string): Promise<void>;
}


export interface WebhookDeps {
  env: Env;
  store: ProcessedEventStore;
  /** Must verify the signature against the raw body; rejects on mismatch. */
  constructEvent: (rawBody: string, signatureHeader: string, secret: string) => Promise<Stripe.Event>;
  sendMail: SendMail;
  nowMs: () => number;
}

function isHandled(type: string): type is HandledEventType {
  return (HANDLED_EVENT_TYPES as readonly string[]).includes(type);
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : value.id;
}

function formatAddress(address: Stripe.Address | null | undefined): string {
  if (!address) {
    return 'nicht angegeben';
  }
  const parts = [
    address.line1,
    address.line2,
    [address.postal_code, address.city].filter(Boolean).join(' '),
    address.state,
    address.country,
  ].filter((part): part is string => typeof part === 'string' && part.trim() !== '');
  return parts.length > 0 ? parts.join(', ') : 'nicht angegeben';
}

function formatAmount(cents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof cents !== 'number') {
    return 'unbekannt';
  }
  if ((currency ?? '').toLowerCase() === 'eur') {
    return formatEuroCents(cents);
  }
  return `${(cents / 100).toFixed(2)} ${(currency ?? '').toUpperCase()}`;
}

export function productLabel(metadata: Stripe.Metadata | null | undefined): string {
  const product = metadata?.product ?? '';
  if (product === 'quote') {
    return `Angebot ${metadata?.quote_number ?? '(ohne Nummer)'}`;
  }
  return findFixedPriceProduct(product)?.name ?? `Unbekanntes Produkt (${product || 'leer'})`;
}

export function buildPaymentMail(
  type: HandledEventType,
  session: Stripe.Checkout.Session,
  livemode: boolean,
  mail: MailConfig,
): MailMessage {
  const label = productLabel(session.metadata);
  const amount = formatAmount(session.amount_total, session.currency);
  const dashboardBase = `https://dashboard.stripe.com/${livemode ? '' : 'test/'}`;
  const paymentIntentId = idOf(session.payment_intent);
  const invoiceId = idOf(session.invoice);
  const dashboardUrl = paymentIntentId
    ? `${dashboardBase}payments/${paymentIntentId}`
    : `${dashboardBase}search?query=${encodeURIComponent(session.id)}`;

  let headline: string;
  let subjectPrefix: string;
  if (type === 'checkout.session.async_payment_failed') {
    headline = 'Zahlung fehlgeschlagen (z. B. SEPA-Lastschrift zurückgewiesen). Leistung erst nach Klärung erbringen.';
    subjectPrefix = 'Zahlung fehlgeschlagen';
  } else if (type === 'checkout.session.async_payment_succeeded') {
    headline = 'Die zuvor ausstehende Zahlung ist jetzt eingegangen.';
    subjectPrefix = 'Zahlung bestätigt';
  } else if (session.payment_status === 'paid') {
    headline = 'Zahlung eingegangen.';
    subjectPrefix = 'Zahlung eingegangen';
  } else {
    headline =
      'Bestellung abgeschlossen, Zahlung noch ausstehend (z. B. SEPA-Lastschrift). Stripe meldet den Eingang separat.';
    subjectPrefix = 'Bestellung eingegangen, Zahlung ausstehend';
  }

  const details = session.customer_details;
  const businessName =
    session.collected_information?.business_name ?? details?.business_name ?? 'nicht angegeben';
  const taxIds =
    details?.tax_ids && details.tax_ids.length > 0
      ? details.tax_ids.map((taxId) => `${taxId.value} (${taxId.type})`).join(', ')
      : 'keine';

  const rows: Array<[string, string]> = [
    ['Produkt', label],
    ['Betrag gesamt', amount],
    ['davon netto', formatAmount(session.amount_subtotal, session.currency)],
    ['davon Steuer', formatAmount(session.total_details?.amount_tax ?? 0, session.currency)],
    ['Steuermodus', session.metadata?.tax_mode ?? 'unbekannt'],
    ['Zahlungsstatus (Stripe)', session.payment_status],
    ['Firma', businessName],
    ['Ansprechpartner', details?.name ?? 'nicht angegeben'],
    ['E-Mail', details?.email ?? 'nicht angegeben'],
    ['Rechnungsadresse', formatAddress(details?.address)],
    ['USt-IdNr.', taxIds],
    ['Als Unternehmer bestellt (§ 14 BGB)', session.metadata?.b2b_declared === 'true' ? 'ja' : 'nein'],
    ['Checkout-Session', session.id],
    ['Modus', livemode ? 'Live' : 'TEST'],
  ];
  if (invoiceId) {
    rows.push(['Rechnung (Stripe)', `${dashboardBase}invoices/${invoiceId}`]);
  }
  rows.push(['Stripe-Dashboard', dashboardUrl]);

  const subject = `${livemode ? '' : '[TEST] '}${subjectPrefix}: ${label} (${amount})`;
  const html = [
    `<p><strong>${escapeHtml(headline)}</strong></p>`,
    '<table cellpadding="4" cellspacing="0" border="0">',
    ...rows.map(
      ([key, value]) =>
        `<tr><td valign="top"><strong>${escapeHtml(key)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
    ),
    '</table>',
    '<p>Der Kunde hat von Stripe Zahlungsbeleg und Rechnung per E-Mail erhalten. Nächster Schritt: Kontakt aufnehmen (Terminabstimmung innerhalb von 1 Werktag).</p>',
  ].join('\n');
  const text = [headline, '', ...rows.map(([key, value]) => `${key}: ${value}`)].join('\n');

  return { from: mail.from, to: mail.to, subject, html, text };
}

export async function handleStripeWebhook(request: Request, deps: WebhookDeps): Promise<Response> {
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }
  const webhookSecret = readWebhookSecret(deps.env);
  if (!webhookSecret.ok) {
    // 5xx makes Stripe retry, so no event is lost while the config is fixed.
    console.error(`[stripe-webhook] ${webhookSecret.problem}`);
    return json(500, { error: 'Webhook not configured.' });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return json(400, { error: 'Missing signature.' });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return json(413, { error: 'Payload too large.' });
  }

  let event: Stripe.Event;
  try {
    event = await deps.constructEvent(rawBody, signature, webhookSecret.value);
  } catch {
    console.warn('[stripe-webhook] Rejected request with invalid signature.');
    return json(400, { error: 'Invalid signature.' });
  }

  if (!isHandled(event.type)) {
    return json(200, { received: true, ignored: true });
  }

  const mailConfig = readMailConfig(deps.env);
  if (!mailConfig.ok) {
    console.error(`[stripe-webhook] ${mailConfig.problem} Event ${event.id} will be retried by Stripe.`);
    return json(500, { error: 'Notification channel not configured.' });
  }

  let claim: ClaimResult;
  try {
    claim = await deps.store.claim(event.id, event.type, deps.nowMs());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[stripe-webhook] Event store unavailable for ${event.id}: ${reason}`);
    return json(500, { error: 'Event store unavailable.' });
  }
  if (claim === 'done') {
    return json(200, { received: true, duplicate: true });
  }
  if (claim === 'in_progress') {
    // Another delivery of the same event is being processed right now.
    return json(409, { error: 'Event is being processed.' });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const message = buildPaymentMail(event.type, session, event.livemode, mailConfig.value);
  try {
    await deps.sendMail(message, mailConfig.value.resendApiKey, `stripe-event-${event.id}`);
  } catch (error) {
    await deps.store.release(event.id).catch((releaseError: unknown) => {
      const detail = releaseError instanceof Error ? releaseError.message : String(releaseError);
      console.error(`[stripe-webhook] Could not release claim for ${event.id}: ${detail}`);
    });
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[stripe-webhook] Notification for ${event.id} (${event.type}) failed: ${reason}`);
    return json(500, { error: 'Notification failed.' });
  }
  try {
    await deps.store.complete(event.id, event.type, deps.nowMs());
  } catch (error) {
    // The mail went out; a retry is deduplicated by the Resend idempotency key.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[stripe-webhook] Could not mark ${event.id} as done: ${reason}`);
  }
  console.log(`[stripe-webhook] Processed ${event.id} (${event.type}).`);
  return json(200, { received: true });
}
