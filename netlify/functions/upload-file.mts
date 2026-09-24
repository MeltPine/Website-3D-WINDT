import type { Config } from '@netlify/functions';
import { binaryResponse, jsonResponse } from '../shared/http';
import { chunkKey, manifestKey, readSecret, verifyDownload, type UploadManifest } from '../shared/uploadCore';
import { openUploadStore } from '../shared/uploadStore';

/**
 * Read access for the internal retrieval page (/datei-abruf/). Authorised by
 * the HMAC-signed link parameters; without `chunk` it returns the file
 * manifest, with `chunk=n` the raw chunk. Chunks are served one by one because
 * Function responses are capped (6 MB buffered, 20 MB streamed).
 */
export default async (request: Request): Promise<Response> => {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Methode nicht erlaubt.' });
  }
  const secret = readSecret(process.env);
  if (!secret) {
    console.error('UPLOAD_SIGNING_SECRET is missing or shorter than 32 characters.');
    return jsonResponse(503, { error: 'Dateiabruf derzeit nicht verfügbar.' });
  }
  const params = new URL(request.url).searchParams;
  const ref = verifyDownload(params, secret, Math.floor(Date.now() / 1000));
  if (!ref) {
    return jsonResponse(403, { error: 'Link ungültig oder abgelaufen.' });
  }

  const store = openUploadStore();
  let manifest: UploadManifest | null;
  try {
    manifest = (await store.get(manifestKey(ref.day, ref.uid), { type: 'json' })) as UploadManifest | null;
  } catch (error) {
    console.error('Failed to read upload manifest', { uid: ref.uid, error });
    return jsonResponse(502, { error: 'Abruf fehlgeschlagen.' });
  }
  const file = manifest?.files.find((entry) => entry.fid === ref.fid);
  if (!file) {
    return jsonResponse(404, { error: 'Datei nicht gefunden (evtl. bereits gelöscht).' });
  }

  const chunkRaw = params.get('chunk');
  if (chunkRaw === null) {
    return jsonResponse(200, {
      name: file.name,
      size: file.size,
      chunks: file.chunks,
      chunkSha256: file.chunkSha256,
      uploadedAt: manifest?.completedAt ?? null,
    });
  }
  if (!/^\d{1,5}$/.test(chunkRaw) || Number(chunkRaw) >= file.chunks) {
    return jsonResponse(400, { error: 'Ungültiger Chunk-Index.' });
  }
  try {
    const data = await store.get(chunkKey(ref.day, ref.uid, ref.fid, Number(chunkRaw)), { type: 'arrayBuffer' });
    if (!data) {
      return jsonResponse(404, { error: 'Dateiteil fehlt.' });
    }
    return binaryResponse(data);
  } catch (error) {
    console.error('Failed to read upload chunk', { uid: ref.uid, error });
    return jsonResponse(502, { error: 'Abruf fehlgeschlagen.' });
  }
};

export const config: Config = {
  path: '/api/uploads/file',
  method: 'GET',
  rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
