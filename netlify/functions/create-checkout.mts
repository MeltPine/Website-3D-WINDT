import type { Config } from '@netlify/functions';
import Stripe from 'stripe';
import { handleCreateCheckout, type CheckoutStripeClient } from '../shared/checkout';

function stripeFor(secretKey: string): CheckoutStripeClient {
  const stripe = new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 15_000 });
  return {
    retrievePrice: (id) => stripe.prices.retrieve(id),
    retrieveTaxRate: (id) => stripe.taxRates.retrieve(id),
    createSession: (params) => stripe.checkout.sessions.create(params),
  };
}

export default (request: Request): Promise<Response> =>
  handleCreateCheckout(request, {
    env: process.env,
    nowSeconds: () => Math.floor(Date.now() / 1000),
    stripeFor,
  });

export const config: Config = {
  path: '/api/checkout',
  method: 'POST',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
