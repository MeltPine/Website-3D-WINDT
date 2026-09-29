import Stripe from 'stripe';
import type { CheckoutStripeClient } from './checkout';

/*
 * Stripe SDK wiring for the Workers runtime: HTTP through fetch (no Node
 * http module), webhook signatures through WebCrypto (constructEventAsync).
 */

const webCryptoProvider = Stripe.createSubtleCryptoProvider();

export function stripeFor(secretKey: string): CheckoutStripeClient {
  const stripe = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
    timeout: 15_000,
  });
  return {
    retrievePrice: (id) => stripe.prices.retrieve(id),
    retrieveTaxRate: (id) => stripe.taxRates.retrieve(id),
    createSession: (params) => stripe.checkout.sessions.create(params),
  };
}

/** Verifies the signature over the untouched raw body (default tolerance 300 s). */
export function constructStripeEvent(rawBody: string, signature: string, secret: string): Promise<Stripe.Event> {
  return Stripe.webhooks.constructEventAsync(rawBody, signature, secret, undefined, webCryptoProvider);
}
