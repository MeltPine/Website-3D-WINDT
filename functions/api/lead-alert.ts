import { handleLeadAlert } from '../../server/leadAlert';
import { newId, pagesHandler, systemClock } from '../../server/pages';
import { sendMailViaResend } from '../../server/resend';

/** POST /api/lead-alert — internal alert when a submission failed in the browser. */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleLeadAlert(request, { env, kv: bindings.STATE, sendMail: sendMailViaResend, now: systemClock.now, newId }),
);
