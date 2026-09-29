import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UPLOAD_POLICY } from '../src/lib/upload/policy';
import { fileKey, manifestKey } from '../server/uploadCore';
import {
  handleUploadChunk,
  handleUploadComplete,
  handleUploadFile,
  handleUploadInit,
  type UploadDeps,
} from '../server/uploads';
import { MemoryKV, MemoryR2 } from './helpers/cloudflare';

const SITE = 'https://3d-windt.de';
const ENV = { UPLOAD_SIGNING_SECRET: 's'.repeat(48) };
const NOW = new Date('2026-09-30T10:00:00Z');

let bucket: MemoryR2;
let kv: MemoryKV;
let deps: UploadDeps;

function sha(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('base64url');
}

function bytes(size: number, seed: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) data[i] = (i * 31 + seed) % 251;
  return data;
}

function post(path: string, body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}${path}`, {
    method: 'POST',
    headers: { Origin: SITE, 'cf-connecting-ip': '203.0.113.7', ...headers },
    body,
  });
}

async function init(files: Array<{ name: string; size: number }>) {
  const response = await handleUploadInit(
    post('/api/uploads/init', JSON.stringify({ files, website: '' }), { 'Content-Type': 'application/json' }),
    deps,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as {
    token: string;
    chunkBytes: number;
    files: Array<{ fid: string; chunks: number }>;
  };
}

async function sendChunk(token: string, fid: string, index: number, data: Uint8Array, checksum = sha(data)) {
  return handleUploadChunk(
    post(`/api/uploads/chunk?fid=${fid}&index=${index}`, data, {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'X-Chunk-Sha256': checksum,
    }),
    deps,
  );
}

beforeEach(() => {
  bucket = new MemoryR2();
  kv = new MemoryKV();
  deps = { env: ENV, bucket, kv, now: () => NOW };
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('upload endpoints on R2', () => {
  it('assembles a multi-part file and serves verified chunk ranges', async () => {
    const size = 2 * UPLOAD_POLICY.chunkBytes + 1234;
    const file = bytes(size, 7);
    const session = await init([{ name: 'halter.stl', size }]);
    const { fid, chunks } = session.files[0];
    expect(chunks).toBe(3);

    // Out of order and one retried chunk: both must be harmless.
    for (const index of [2, 0, 1, 1]) {
      const start = index * session.chunkBytes;
      const response = await sendChunk(session.token, fid, index, file.slice(start, start + session.chunkBytes));
      expect(response.status).toBe(200);
    }

    const complete = async () => {
      const response = await handleUploadComplete(
        post('/api/uploads/complete', '{}', { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' }),
        deps,
      );
      expect(response.status).toBe(200);
      return (await response.json()) as { files: Array<{ complete: boolean; downloadPath: string }>; incomplete: string[] };
    };
    const first = await complete();
    expect(first.incomplete).toEqual([]);
    expect(first.files[0].complete).toBe(true);
    // Retried completion is idempotent.
    expect((await complete()).files[0].complete).toBe(true);

    const day = NOW.toISOString().slice(0, 10);
    const key = [...bucket.objects.keys()].find((entry) => entry.startsWith(`uploads/files/${day}/`) && entry.endsWith(fid));
    expect(key).toBeDefined();
    expect(sha(bucket.objects.get(key!)!.data)).toBe(sha(file));

    const link = new URL(first.files[0].downloadPath, SITE);
    const manifestResponse = await handleUploadFile(new Request(`${SITE}/api/uploads/file${link.search}`), deps);
    const manifest = (await manifestResponse.json()) as { size: number; chunks: number; chunkSha256: string[] };
    expect(manifest.size).toBe(size);
    expect(manifest.chunks).toBe(3);

    const parts: Uint8Array[] = [];
    for (let index = 0; index < manifest.chunks; index += 1) {
      const response = await handleUploadFile(new Request(`${SITE}/api/uploads/file${link.search}&chunk=${index}`), deps);
      expect(response.status).toBe(200);
      const part = new Uint8Array(await response.arrayBuffer());
      expect(sha(part)).toBe(manifest.chunkSha256[index]);
      parts.push(part);
    }
    expect(sha(Buffer.concat(parts))).toBe(sha(file));

    const outOfRange = await handleUploadFile(new Request(`${SITE}/api/uploads/file${link.search}&chunk=3`), deps);
    expect(outOfRange.status).toBe(400);
  });

  it('reports files with missing chunks as incomplete and keeps them out of the manifest', async () => {
    const small = bytes(1000, 1);
    const session = await init([
      { name: 'ok.stl', size: small.byteLength },
      { name: 'missing.step', size: UPLOAD_POLICY.chunkBytes + 10 },
    ]);
    expect((await sendChunk(session.token, session.files[0].fid, 0, small)).status).toBe(200);

    const response = await handleUploadComplete(
      post('/api/uploads/complete', '{}', { Authorization: `Bearer ${session.token}` }),
      deps,
    );
    const body = (await response.json()) as { incomplete: string[]; files: Array<{ complete: boolean }> };
    expect(body.incomplete).toEqual([session.files[1].fid]);
    expect(body.files.map((file) => file.complete)).toEqual([true, false]);
    const manifestEntry = [...bucket.objects.entries()].find(([key]) => key.endsWith('manifest.json'));
    const manifest = JSON.parse(new TextDecoder().decode(manifestEntry![1].data)) as { files: unknown[] };
    expect(manifest.files).toHaveLength(1);
    // The unfinished multipart upload stays open for the lifecycle rule to abort.
    expect(bucket.multipart.size).toBe(1);
  });

  it('rejects wrong checksums, wrong sizes, foreign files and missing tokens', async () => {
    const data = bytes(500, 3);
    const session = await init([{ name: 'a.stl', size: 500 }]);
    const fid = session.files[0].fid;
    expect((await sendChunk(session.token, fid, 0, data, 'A'.repeat(43))).status).toBe(422);
    expect((await sendChunk(session.token, fid, 0, data.slice(0, 10))).status).toBe(400);
    expect((await sendChunk(session.token, '0b5c3a8e-1f2d-4c3b-9a8e-7d6c5b4a3f21', 0, data)).status).toBe(404);
    expect((await sendChunk('garbage.token', fid, 0, data)).status).toBe(401);
    expect((await sendChunk(session.token, fid, 1, data)).status).toBe(400);
  });

  it('refuses cross-origin requests, missing secrets and invalid selections', async () => {
    const crossOrigin = new Request(`${SITE}/api/uploads/init`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example' },
      body: JSON.stringify({ files: [{ name: 'a.stl', size: 1 }] }),
    });
    expect((await handleUploadInit(crossOrigin, deps)).status).toBe(403);

    const noSecret = { ...deps, env: {} };
    const request = post('/api/uploads/init', JSON.stringify({ files: [{ name: 'a.stl', size: 1 }] }));
    expect((await handleUploadInit(request, noSecret)).status).toBe(503);

    const exe = post('/api/uploads/init', JSON.stringify({ files: [{ name: 'a.exe', size: 1 }] }));
    expect((await handleUploadInit(exe, deps)).status).toBe(400);

    const get = new Request(`${SITE}/api/uploads/init`);
    expect((await handleUploadInit(get, deps)).status).toBe(405);
  });

  it('rate-limits session creation per client', async () => {
    for (let i = 0; i < 10; i += 1) {
      await init([{ name: 'a.stl', size: 1 }]);
    }
    const response = await handleUploadInit(
      post('/api/uploads/init', JSON.stringify({ files: [{ name: 'a.stl', size: 1 }] })),
      deps,
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toMatch(/^\d+$/);
  });

  it('rejects tampered or expired download links', async () => {
    const data = bytes(100, 9);
    const session = await init([{ name: 'a.stl', size: 100 }]);
    await sendChunk(session.token, session.files[0].fid, 0, data);
    const completed = (await (
      await handleUploadComplete(post('/api/uploads/complete', '{}', { Authorization: `Bearer ${session.token}` }), deps)
    ).json()) as { files: Array<{ downloadPath: string }> };
    const link = new URL(completed.files[0].downloadPath, SITE);

    const tampered = new URLSearchParams(link.search);
    tampered.set('e', String(Number(tampered.get('e')) + 1));
    expect((await handleUploadFile(new Request(`${SITE}/api/uploads/file?${tampered}`), deps)).status).toBe(403);

    const later = { ...deps, now: () => new Date(NOW.getTime() + 200 * 86_400_000) };
    expect((await handleUploadFile(new Request(`${SITE}/api/uploads/file${link.search}`), later)).status).toBe(403);

    // Deleted by the lifecycle rule before the link expired: clean 404.
    const day = NOW.toISOString().slice(0, 10);
    const uid = link.searchParams.get('u')!;
    await bucket.delete(manifestKey(day, uid));
    await bucket.delete(fileKey(day, uid, session.files[0].fid));
    expect((await handleUploadFile(new Request(`${SITE}/api/uploads/file${link.search}`), deps)).status).toBe(404);
  });
});
