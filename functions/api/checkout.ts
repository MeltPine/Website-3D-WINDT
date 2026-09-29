import { handleCreateCheckout } from '../../server/checkout';
import { pagesHandler, systemClock } from '../../server/pages';
import { RATE_LIMITS, enforceRateLimit } from '../../server/rateLimit';
import { stripeFor } from '../../server/stripeClient';

/** POST /api/checkout */
export const onRequest = pagesHandler(async ({ request, env, bindings }) => {
  if (request.method === 'POST') {
    const limited = await enforceRateLimit(bindings.STATE, RATE_LIMITS.checkout, request, systemClock.nowMs());
    if (limited) {
      return limited;
    }
  }
  return handleCreateCheckout(request, { env, nowSeconds: systemClock.nowSeconds, stripeFor });
});
