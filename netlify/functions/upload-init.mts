import type { Config } from '@netlify/functions';
import { UPLOAD_POLICY, validateUploadSelection } from '../../src/lib/upload/policy';
import { declaredContentLength, guardMutatingRequest, jsonResponse } from '../shared/http';
import { createSession, signSession } from '../shared/uploadCore';

const MAX_INIT_BODY_BYTES = 16 * 1024;

interface InitBody {
  files?: unknown;
  /** Honeypot, must stay empty. */
  website?: unknown;
}

export default async (request: Request): Promise<Response> => {
  const guard = guardMutatingRequest(request);
  if ('response' in guard) {
    return guard.response;
  }

  const declared = declaredContentLength(request);
  if (declared !== null && declared > MAX_INIT_BODY_BYTES) {
    return jsonResponse(413, { error: 'Anfrage zu groß.' });
  }
  const raw = await request.text();
  if (raw.length > MAX_INIT_BODY_BYTES) {
    return jsonResponse(413, { error: 'Anfrage zu groß.' });
  }

  let body: InitBody;
  try {
    body = JSON.parse(raw) as InitBody;
  } catch {
    return jsonResponse(400, { error: 'Ungültige Anfrage.' });
  }
  if (typeof body !== 'object' || body === null) {
    return jsonResponse(400, { error: 'Ungültige Anfrage.' });
  }
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse(400, { error: 'Ungültige Anfrage.' });
  }
  if (!Array.isArray(body.files)) {
    return jsonResponse(400, { error: 'Dateiliste fehlt.' });
  }

  const files = body.files.map((entry) => {
    const candidate = (typeof entry === 'object' && entry !== null ? entry : {}) as {
      name?: unknown;
      size?: unknown;
    };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : '',
      size: typeof candidate.size === 'number' ? candidate.size : -1,
    };
  });
  const validationError = validateUploadSelection(files);
  if (validationError) {
    return jsonResponse(400, { error: validationError });
  }

  const session = createSession(files, new Date());
  return jsonResponse(200, {
    token: signSession(session, guard.secret),
    uploadId: session.uid,
    chunkBytes: UPLOAD_POLICY.chunkBytes,
    files: session.files.map(({ fid, name, size, chunks }) => ({ fid, name, size, chunks })),
  });
};

export const config: Config = {
  path: '/api/uploads/init',
  method: 'POST',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
