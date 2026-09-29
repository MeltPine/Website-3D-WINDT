import { pagesHandler, systemClock } from '../../../server/pages';
import { handleUploadComplete } from '../../../server/uploads';

/** POST /api/uploads/complete */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleUploadComplete(request, { env, bucket: bindings.UPLOADS, kv: bindings.STATE, now: systemClock.now }),
);
