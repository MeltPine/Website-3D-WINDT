import { vatForNetCents } from '../../src/lib/payment/catalog';
import { readPaymentLinkSecret, readTaxMode, type Env } from './paymentConfig';
import { PAYMENTS_UNAVAILABLE, json } from './paymentHttp';
import { verifyPaymentLink } from './paymentLink.mjs';
import { linkFailureMessage } from './paymentLinkMessages';

export interface VerifyDeps {
  env: Env;
  nowSeconds: () => number;
}

/**
 * Read-only check behind the /bezahlen/ page: tells the browser whether a pay
 * link is authentic and what it will charge. The secret never leaves the
 * server; knowing that a link is valid does not help forging another one.
 */
export function handleVerifyPaymentLink(request: Request, deps: VerifyDeps): Response {
  if (request.method !== 'GET') {
    return json(405, { error: 'Methode nicht erlaubt.' });
  }
  const taxMode = readTaxMode(deps.env);
  if (!taxMode.ok) {
    console.error(`[payment-link] ${taxMode.problem}`);
    return json(503, { error: PAYMENTS_UNAVAILABLE });
  }
  const secret = readPaymentLinkSecret(deps.env);
  if (!secret.ok) {
    console.error(`[payment-link] ${secret.problem}`);
    return json(503, { error: PAYMENTS_UNAVAILABLE });
  }

  const params = new URL(request.url).searchParams;
  const verified = verifyPaymentLink(
    { q: params.get('q'), a: params.get('a'), e: params.get('e'), s: params.get('s') },
    secret.value,
    deps.nowSeconds(),
  );
  if (!verified.ok) {
    return json(verified.reason === 'expired' ? 410 : 400, { error: linkFailureMessage(verified.reason) });
  }

  const { quoteNumber, amountCents, expiresAt } = verified.link;
  const vatCents = taxMode.value === 'regelbesteuerung' ? vatForNetCents(amountCents) : 0;
  return json(200, {
    quoteNumber,
    netAmountCents: amountCents,
    vatCents,
    totalCents: amountCents + vatCents,
    taxMode: taxMode.value,
    expiresAt,
  });
}
