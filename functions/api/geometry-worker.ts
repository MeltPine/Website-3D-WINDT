import { handleGeometryWorker } from '../../server/workerEntry';
import type { PagesHandler } from '../../server/env';

/** GET /api/geometry-worker — worker bootstrap with its own CSP (see server/workerEntry.ts). */
export const onRequest: PagesHandler = ({ request }) => handleGeometryWorker(request);
