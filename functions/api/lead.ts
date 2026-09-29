import { handleLead } from '../../server/lead';
import { newId, pagesHandler, systemClock } from '../../server/pages';
import { sendMailViaResend } from '../../server/resend';

/** POST /api/lead — contact-request and project-request submissions. */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleLead(request, {
    env,
    bucket: bindings.UPLOADS,
    kv: bindings.STATE,
    sendMail: sendMailViaResend,
    now: systemClock.now,
    newId,
  }),
);
