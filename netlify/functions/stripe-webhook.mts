import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import Stripe from 'stripe';
import {
  STRIPE_EVENT_STORE_NAME,
  STRIPE_EVENT_STORE_REGION,
  createBlobEventStore,
} from '../shared/stripeEventStore';
import { handleStripeWebhook, sendMailViaResend } from '../shared/stripeWebhook';

export default (request: Request): Promise<Response> =>
  handleStripeWebhook(request, {
    env: process.env,
    // Region passed explicitly: site-wide stores otherwise default to us-east-2.
    store: createBlobEventStore(
      getStore({ name: STRIPE_EVENT_STORE_NAME, region: STRIPE_EVENT_STORE_REGION, consistency: 'strong' }),
    ),
    // Signature check over the untouched raw body (default tolerance 300 s).
    constructEvent: (rawBody, signature, secret) => Stripe.webhooks.constructEvent(rawBody, signature, secret),
    sendMail: sendMailViaResend,
    nowMs: () => Date.now(),
  });

export const config: Config = {
  path: '/api/stripe/webhook',
  method: 'POST',
};
