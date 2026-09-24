import type { Config } from '@netlify/functions';
import { guardMutatingRequest, jsonResponse } from '../shared/http';
import {
  bearerToken,
  chunkKey,
  downloadExpiry,
  downloadPath,
  manifestKey,
  verifySession,
  type SessionFile,
  type UploadManifest,
  type UploadManifestFile,
} from '../shared/uploadCore';
import { openUploadStore } from '../shared/uploadStore';

type Store = ReturnType<typeof openUploadStore>;

async function collectChunkChecksums(store: Store, day: string, uid: string, file: SessionFile) {
  const checksums: string[] = [];
  for (let index = 0; index < file.chunks; index += 1) {
    const meta = await store.getMetadata(chunkKey(day, uid, file.fid, index));
    const sha256 = meta?.metadata?.sha256;
    if (typeof sha256 !== 'string') {
      return null;
    }
    checksums.push(sha256);
  }
  return checksums;
}

/**
 * Verifies that every chunk of every file in the session is stored, writes
 * the manifest and returns signed retrieval links. Files with missing chunks
 * are reported as incomplete and left out of the manifest.
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

  const store = openUploadStore();
  const completed: UploadManifestFile[] = [];
  const incomplete: string[] = [];
  try {
    const results = await Promise.all(
      session.files.map(async (file) => ({
        file,
        checksums: await collectChunkChecksums(store, session.day, session.uid, file),
      })),
    );
    for (const { file, checksums } of results) {
      if (checksums) {
        completed.push({ ...file, chunkSha256: checksums });
      } else {
        incomplete.push(file.fid);
      }
    }
    if (completed.length > 0) {
      const manifest: UploadManifest = {
        uid: session.uid,
        day: session.day,
        completedAt: new Date().toISOString(),
        files: completed,
      };
      await store.setJSON(manifestKey(session.day, session.uid), manifest);
    }
  } catch (error) {
    console.error('Failed to complete upload', { uid: session.uid, error });
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
};

export const config: Config = {
  path: '/api/uploads/complete',
  method: 'POST',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
