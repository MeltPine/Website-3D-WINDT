import { pagesHandler, systemClock } from '../../../server/pages';
import { handleUploadInit } from '../../../server/uploads';

/** POST /api/uploads/init */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleUploadInit(request, { env, bucket: bindings.UPLOADS, kv: bindings.STATE, now: systemClock.now }),
);
