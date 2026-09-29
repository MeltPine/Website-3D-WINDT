import { pagesHandler, systemClock } from '../../../server/pages';
import { handleUploadChunk } from '../../../server/uploads';

/** POST /api/uploads/chunk?fid=<uuid>&index=<n> */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleUploadChunk(request, { env, bucket: bindings.UPLOADS, kv: bindings.STATE, now: systemClock.now }),
);
