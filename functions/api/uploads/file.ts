import { pagesHandler, systemClock } from '../../../server/pages';
import { handleUploadFile } from '../../../server/uploads';

/** GET /api/uploads/file?d&u&f&e&s[&chunk=n] — backs the /datei-abruf/ page. */
export const onRequest = pagesHandler(({ request, env, bindings }) =>
  handleUploadFile(request, { env, bucket: bindings.UPLOADS, now: systemClock.now }),
);
