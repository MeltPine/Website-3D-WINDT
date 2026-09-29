import { pagesHandler, systemClock } from '../../../server/pages';
import { sendMailViaResend } from '../../../server/resend';
import { constructStripeEvent } from '../../../server/stripeClient';
import { createKvEventStore } from '../../../server/stripeEventStore';
import { handleStripeWebhook } from '../../../server/stripeWebhook';

/** POST /api/stripe/webhook — endpoint URL registered in Stripe stays unchanged. */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleStripeWebhook(request, {
    env,
    store: createKvEventStore(bindings.STATE),
    constructEvent: constructStripeEvent,
    sendMail: sendMailViaResend,
    nowMs: systemClock.nowMs,
  }),
);
