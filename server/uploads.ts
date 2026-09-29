import { UPLOAD_POLICY, expectedChunkLength, validateUploadSelection } from '../src/lib/upload/policy';
import type { Env, KVNamespaceLike, R2BucketLike } from './env';
import { binaryResponse, declaredContentLength, guardMutatingRequest, jsonResponse, readLimitedBytes } from './http';
import { RATE_LIMITS, enforceRateLimit } from './rateLimit';
import {
  bearerToken,
  chunkRange,
  downloadExpiry,
  downloadPath,
  fileKey,
  isUploadId,
  manifestKey,
  parsePartReceipt,
  partReceiptKey,
  planSession,
  readSecret,
  sha256Base64url,
  signSession,
  verifyDownload,
  verifySession,
  withMultipartIds,
  type PartReceipt,
  type SessionFile,
  type SessionToken,
  type UploadManifest,
  type UploadManifestFile,
} from './uploadCore';

/*
 * Chunked upload endpoints (/api/uploads/init|chunk|complete|file), platform
 * independent. Storage: one R2 multipart upload per file; see uploadCore.ts
 * for the key layout and infra/r2-lifecycle.json for retention.
 */

export interface UploadDeps {
  env: Env;
  bucket: R2BucketLike;
  kv: KVNamespaceLike;
  now: () => Date;
}

const MAX_INIT_BODY_BYTES = 16 * 1024;

interface InitBody {
  files?: unknown;
  /** Honeypot, must stay empty. */
  website?: unknown;
}

function sessionFrom(request: Request, secret: string, now: Date): SessionToken | null {
  const token = bearerToken(request.headers.get('authorization'));
  return token ? verifySession(token, secret, Math.floor(now.getTime() / 1000)) : null;
}

export async function handleUploadInit(request: Request, deps: UploadDeps): Promise<Response> {
  const guard = guardMutatingRequest(request, deps.env);
  if ('response' in guard) {
    return guard.response;
  }
  const limited = await enforceRateLimit(deps.kv, RATE_LIMITS.uploadInit, request, deps.now().getTime());
  if (limited) {
    return limited;
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

  const plan = planSession(files, deps.now());
  let session: SessionToken;
  try {
    const uploads = await Promise.all(
      plan.files.map((file) =>
        deps.bucket.createMultipartUpload(fileKey(plan.day, plan.uid, file.fid), {
          httpMetadata: { contentType: 'application/octet-stream' },
          customMetadata: { name: encodeURIComponent(file.name), size: String(file.size) },
        }),
      ),
    );
    session = withMultipartIds(
      plan,
      uploads.map((upload) => upload.uploadId),
    );
  } catch (error) {
    console.error('Failed to open multipart uploads', { uid: plan.uid, error: String(error) });
    return jsonResponse(502, { error: 'Upload konnte nicht gestartet werden, bitte erneut versuchen.' });
  }

  return jsonResponse(200, {
    token: signSession(session, guard.secret),
    uploadId: session.uid,
    chunkBytes: UPLOAD_POLICY.chunkBytes,
    files: session.files.map(({ fid, name, size, chunks }) => ({ fid, name, size, chunks })),
  });
}

/**
 * Stores one chunk as multipart part `index + 1` and writes its receipt.
 * Idempotent: a retried chunk replaces the part and the receipt.
 */
export async function handleUploadChunk(request: Request, deps: UploadDeps): Promise<Response> {
  const guard = guardMutatingRequest(request, deps.env);
  if ('response' in guard) {
    return guard.response;
  }
  const session = sessionFrom(request, guard.secret, deps.now());
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

  const data = await readLimitedBytes(request, UPLOAD_POLICY.chunkBytes);
  if (!data) {
    return jsonResponse(413, { error: 'Chunk zu groß.' });
  }
  if (data.byteLength !== expectedLength) {
    return jsonResponse(400, { error: 'Chunk-Größe stimmt nicht.' });
  }
  const checksum = sha256Base64url(data);
  if (request.headers.get('x-chunk-sha256') !== checksum) {
    return jsonResponse(422, { error: 'Prüfsumme stimmt nicht – Übertragung fehlerhaft.' });
  }

  const key = fileKey(session.day, session.uid, fid);
  try {
    const part = await deps.bucket.resumeMultipartUpload(key, file.mpu).uploadPart(index + 1, data);
    const receipt: PartReceipt = { partNumber: part.partNumber, etag: part.etag, sha256: checksum, size: data.byteLength };
    await deps.bucket.put(partReceiptKey(session.day, session.uid, fid, index), JSON.stringify(receipt), {
      httpMetadata: { contentType: 'application/json' },
    });
  } catch (error) {
    console.error('Failed to store upload chunk', { uid: session.uid, fid, index, error: String(error) });
    return jsonResponse(502, { error: 'Speichern fehlgeschlagen, bitte erneut versuchen.' });
  }
  return jsonResponse(200, { ok: true });
}

async function readReceipts(
  bucket: R2BucketLike,
  session: SessionToken,
  file: SessionFile,
): Promise<PartReceipt[] | null> {
  const receipts = await Promise.all(
    Array.from({ length: file.chunks }, async (_, index) => {
      const object = await bucket.get(partReceiptKey(session.day, session.uid, file.fid, index));
      if (!object) {
        return null;
      }
      const receipt = parsePartReceipt(await object.text(), index + 1);
      return receipt && receipt.size === expectedChunkLength(file.size, index) ? receipt : null;
    }),
  );
  return receipts.every((receipt): receipt is PartReceipt => receipt !== null) ? receipts : null;
}

type FileCompletion = { file: SessionFile; receipts: PartReceipt[] } | { file: SessionFile; receipts: null };

/**
 * Assembles one file. Already assembled (retried completion) counts as done;
 * missing chunks leave the multipart upload open until the lifecycle rule
 * aborts it.
 */
async function completeFile(bucket: R2BucketLike, session: SessionToken, file: SessionFile): Promise<FileCompletion> {
  const receipts = await readReceipts(bucket, session, file);
  if (!receipts) {
    return { file, receipts: null };
  }
  const key = fileKey(session.day, session.uid, file.fid);
  const existing = await bucket.head(key);
  if (existing) {
    return existing.size === file.size ? { file, receipts } : { file, receipts: null };
  }
  const assembled = await bucket
    .resumeMultipartUpload(key, file.mpu)
    .complete(receipts.map(({ partNumber, etag }) => ({ partNumber, etag })));
  if (assembled.size !== file.size) {
    console.error('Assembled upload has an unexpected size', { uid: session.uid, fid: file.fid });
    await bucket.delete(key);
    return { file, receipts: null };
  }
  return { file, receipts };
}

/**
 * Assembles every file whose chunks are all stored, writes the manifest and
 * returns signed retrieval links. Files with missing chunks are reported as
 * incomplete and left out of the manifest.
 */
export async function handleUploadComplete(request: Request, deps: UploadDeps): Promise<Response> {
  const guard = guardMutatingRequest(request, deps.env);
  if ('response' in guard) {
    return guard.response;
  }
  const now = deps.now();
  const session = sessionFrom(request, guard.secret, now);
  if (!session) {
    return jsonResponse(401, { error: 'Upload-Sitzung ungültig oder abgelaufen.' });
  }

  const completed: UploadManifestFile[] = [];
  const incomplete: string[] = [];
  try {
    const results = await Promise.all(session.files.map((file) => completeFile(deps.bucket, session, file)));
    for (const result of results) {
      if (result.receipts) {
        const { fid, name, size, chunks } = result.file;
        completed.push({
          fid,
          name,
          size,
          chunks,
          chunkBytes: UPLOAD_POLICY.chunkBytes,
          chunkSha256: result.receipts.map((receipt) => receipt.sha256),
        });
      } else {
        incomplete.push(result.file.fid);
      }
    }
    if (completed.length > 0) {
      const manifest: UploadManifest = {
        uid: session.uid,
        day: session.day,
        completedAt: now.toISOString(),
        files: completed,
      };
      await deps.bucket.put(manifestKey(session.day, session.uid), JSON.stringify(manifest), {
        httpMetadata: { contentType: 'application/json' },
      });
    }
  } catch (error) {
    console.error('Failed to complete upload', { uid: session.uid, error: String(error) });
    return jsonResponse(502, { error: 'Upload konnte nicht abgeschlossen werden.' });
  }

  const exp = downloadExpiry(session.day);
  return jsonResponse(200, {
    uploadId: session.uid,
    files: session.files.map((file) => {
      const done = completed.some((entry) => entry.fid === file.fid);
      return {
        fid: file.fid,
        name: file.name,
        size: file.size,
        complete: done,
        downloadPath: done
          ? downloadPath({ day: session.day, uid: session.uid, fid: file.fid, exp }, guard.secret)
          : null,
      };
    }),
    incomplete,
  });
}

function parseManifest(raw: string): UploadManifest | null {
  try {
    const manifest = JSON.parse(raw) as UploadManifest;
    return manifest && Array.isArray(manifest.files) ? manifest : null;
  } catch {
    return null;
  }
}

/**
 * Read access for the internal retrieval page (/datei-abruf/). Authorised by
 * the HMAC-signed link parameters; without `chunk` it returns the file
 * manifest, with `chunk=n` the byte range of chunk n (verified client-side
 * against its SHA-256).
 */
export async function handleUploadFile(request: Request, deps: Omit<UploadDeps, 'kv'>): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Methode nicht erlaubt.' }, { Allow: 'GET' });
  }
  const secret = readSecret(deps.env);
  if (!secret) {
    console.error('UPLOAD_SIGNING_SECRET is missing or shorter than 32 characters.');
    return jsonResponse(503, { error: 'Dateiabruf derzeit nicht verfügbar.' });
  }
  const params = new URL(request.url).searchParams;
  const ref = verifyDownload(params, secret, Math.floor(deps.now().getTime() / 1000));
  if (!ref) {
    return jsonResponse(403, { error: 'Link ungültig oder abgelaufen.' });
  }

  let manifest: UploadManifest | null = null;
  try {
    const object = await deps.bucket.get(manifestKey(ref.day, ref.uid));
    manifest = object ? parseManifest(await object.text()) : null;
  } catch (error) {
    console.error('Failed to read upload manifest', { uid: ref.uid, error: String(error) });
    return jsonResponse(502, { error: 'Abruf fehlgeschlagen.' });
  }
  const file = manifest?.files.find((entry) => entry.fid === ref.fid);
  if (!manifest || !file) {
    return jsonResponse(404, { error: 'Datei nicht gefunden (evtl. bereits gelöscht).' });
  }

  const chunkRaw = params.get('chunk');
  if (chunkRaw === null) {
    return jsonResponse(200, {
      name: file.name,
      size: file.size,
      chunks: file.chunks,
      chunkSha256: file.chunkSha256,
      uploadedAt: manifest.completedAt,
    });
  }
  const range = /^\d{1,5}$/.test(chunkRaw) ? chunkRange(file, Number(chunkRaw)) : null;
  if (!range) {
    return jsonResponse(400, { error: 'Ungültiger Chunk-Index.' });
  }
  try {
    const object = await deps.bucket.get(fileKey(ref.day, ref.uid, ref.fid), { range });
    if (!object) {
      return jsonResponse(404, { error: 'Dateiteil fehlt.' });
    }
    return binaryResponse(await object.arrayBuffer());
  } catch (error) {
    console.error('Failed to read upload chunk', { uid: ref.uid, error: String(error) });
    return jsonResponse(502, { error: 'Abruf fehlgeschlagen.' });
  }
}
