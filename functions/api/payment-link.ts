import { pagesHandler, systemClock } from '../../server/pages';
import { handleVerifyPaymentLink } from '../../server/verifyLink';

/** GET /api/payment-link?q&a&e&s — backs the /bezahlen/ page. */
export const onRequest = pagesHandler(({ request, env }) =>
  handleVerifyPaymentLink(request, { env, nowSeconds: systemClock.nowSeconds }),
);
