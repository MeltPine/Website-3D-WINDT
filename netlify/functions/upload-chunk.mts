import type { Config } from '@netlify/functions';
import { UPLOAD_POLICY, expectedChunkLength } from '../../src/lib/upload/policy';
import { declaredContentLength, guardMutatingRequest, jsonResponse } from '../shared/http';
import { bearerToken, chunkKey, isUploadId, sha256Base64url, verifySession } from '../shared/uploadCore';
import { openUploadStore } from '../shared/uploadStore';

/**
 * Stores one chunk of a file announced in the signed session token.
 * Idempotent: a retried chunk simply overwrites the previous attempt.
 */
export default async (request: Request): Promise<Response> => {
  const guard = guardMutatingRequest(request);
  if ('response' in guard) {
    return guard.response;
  }

  const token = bearerToken(request.headers.get('authorization'));
  const session = token ? verifySession(token, guard.secret, Math.floor(Date.now() / 1000)) : null;
  if (!session) {
    return jsonResponse(401, { error: 'Upload-Sitzung ungültig oder abgelaufen.' });
  }

  const url = new URL(request.url);
  const fid = url.searchParams.get('fid');
  const indexRaw = url.searchParams.get('index');
  if (!isUploadId(fid) || !indexRaw || !/^\d{1,5}$/.test(indexRaw)) {
    return jsonResponse(400, { error: 'Ungültige Chunk-Angaben.' });
  }
  const file = session.files.find((entry) => entry.fid === fid);
  if (!file) {
    return jsonResponse(404, { error: 'Datei gehört nicht zu dieser Upload-Sitzung.' });
  }
  const index = Number(indexRaw);
  const expectedLength = expectedChunkLength(file.size, index);
  if (expectedLength < 0) {
    return jsonResponse(400, { error: 'Chunk-Index außerhalb des Bereichs.' });
  }

  const declared = declaredContentLength(request);
  if (declared !== null && declared > UPLOAD_POLICY.chunkBytes) {
    return jsonResponse(413, { error: 'Chunk zu groß.' });
  }
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.byteLength !== expectedLength) {
    return jsonResponse(400, { error: 'Chunk-Größe stimmt nicht.' });
  }
  const checksum = sha256Base64url(data);
  if (request.headers.get('x-chunk-sha256') !== checksum) {
    return jsonResponse(422, { error: 'Prüfsumme stimmt nicht – Übertragung fehlerhaft.' });
  }

  try {
    await openUploadStore().set(chunkKey(session.day, session.uid, fid, index), data.buffer as ArrayBuffer, {
      metadata: { sha256: checksum, size: data.byteLength },
    });
  } catch (error) {
    console.error('Failed to store upload chunk', { uid: session.uid, fid, index, error });
    return jsonResponse(502, { error: 'Speichern fehlgeschlagen, bitte erneut versuchen.' });
  }
  return jsonResponse(200, { ok: true });
};

export const config: Config = {
  path: '/api/uploads/chunk',
  method: 'POST',
  // 200 MB / 3 MiB ≈ 67 chunks per request incl. retries.
  rateLimit: { windowLimit: 240, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
