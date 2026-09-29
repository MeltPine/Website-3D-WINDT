import { describe, expect, it } from 'vitest';
import {
  UPLOAD_POLICY,
  chunkCountFor,
  expectedChunkLength,
  validateUploadSelection,
} from '../src/lib/upload/policy';
import { readFileSync } from 'node:fs';
import {
  FILES_PREFIX,
  PARTS_PREFIX,
  bearerToken,
  chunkRange,
  downloadExpiry,
  downloadPath,
  fileKey,
  isSameOriginRequest,
  manifestKey,
  partReceiptKey,
  planSession,
  readSecret,
  sanitizeFileName,
  signSession,
  verifyDownload,
  verifySession,
  withMultipartIds,
} from '../server/uploadCore';
import { toFileLinks } from '../server/lead';

const SECRET = 'x'.repeat(48);
const MIB = 1024 * 1024;

function createSession(files: Array<{ name: string; size: number }>, now: Date) {
  const plan = planSession(files, now);
  return withMultipartIds(
    plan,
    plan.files.map((_, index) => `mpu-${index}`),
  );
}

describe('upload policy', () => {
  it('splits files into fixed-size chunks with a short tail', () => {
    const size = 2 * UPLOAD_POLICY.chunkBytes + 5;
    expect(chunkCountFor(size)).toBe(3);
    expect(expectedChunkLength(size, 0)).toBe(UPLOAD_POLICY.chunkBytes);
    expect(expectedChunkLength(size, 2)).toBe(size - 2 * UPLOAD_POLICY.chunkBytes);
    expect(expectedChunkLength(size, 3)).toBe(-1);
    expect(expectedChunkLength(size, -1)).toBe(-1);
  });

  it('uses chunks that are valid R2 multipart parts and fit a Workers request', () => {
    expect(UPLOAD_POLICY.chunkBytes).toBeGreaterThanOrEqual(5 * MIB);
    expect(UPLOAD_POLICY.chunkBytes).toBeLessThan(100 * 1000 * 1000);
  });

  it('validates the selection', () => {
    expect(validateUploadSelection([{ name: 'a.step', size: 10 }])).toBeNull();
    expect(validateUploadSelection([])).not.toBeNull();
    expect(validateUploadSelection([{ name: 'a.exe', size: 10 }])).toMatch(/nicht unterstützt/);
    expect(validateUploadSelection([{ name: 'a.stl', size: 0 }])).toMatch(/leer/);
    expect(validateUploadSelection([{ name: 'a.stl', size: 101 * MIB }])).toMatch(/größer/);
    expect(
      validateUploadSelection(Array.from({ length: 3 }, (_, i) => ({ name: `p${i}.stl`, size: 80 * MIB }))),
    ).toMatch(/Gesamtgröße/);
    expect(
      validateUploadSelection(Array.from({ length: 9 }, (_, i) => ({ name: `p${i}.stl`, size: 1 }))),
    ).toMatch(/Maximal/);
  });
});

describe('session tokens', () => {
  const now = new Date('2026-09-24T10:00:00Z');
  const nowSeconds = Math.floor(now.getTime() / 1000);

  it('round-trips a signed session', () => {
    const session = createSession([{ name: 'bracket.step', size: 2 * UPLOAD_POLICY.chunkBytes + 1 }], now);
    const verified = verifySession(signSession(session, SECRET), SECRET, nowSeconds);
    expect(verified).toEqual(session);
    expect(verified?.day).toBe('2026-09-24');
    expect(verified?.files[0].chunks).toBe(3);
    expect(verified?.files[0].mpu).toBe('mpu-0');
  });

  it('requires exactly one multipart upload id per file', () => {
    const plan = planSession([{ name: 'a.stl', size: 1 }, { name: 'b.stl', size: 1 }], now);
    expect(() => withMultipartIds(plan, ['only-one'])).toThrow();
    expect(() => withMultipartIds(plan, ['x', ''])).toThrow();
  });

  it('rejects tampered, foreign-key and expired tokens', () => {
    const session = createSession([{ name: 'a.stl', size: 10 }], now);
    const token = signSession(session, SECRET);
    const [body, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...session, files: [{ ...session.files[0], size: 500 * MIB }] }),
    ).toString('base64url');
    expect(verifySession(`${forged}.${signature}`, SECRET, nowSeconds)).toBeNull();
    expect(verifySession(`${body}.${signature}`, 'y'.repeat(48), nowSeconds)).toBeNull();
    expect(verifySession(token, SECRET, session.exp + 1)).toBeNull();
    expect(verifySession('garbage', SECRET, nowSeconds)).toBeNull();
  });

  it('parses bearer headers strictly', () => {
    expect(bearerToken('Bearer abc.def')).toBe('abc.def');
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken(null)).toBeNull();
  });

  it('requires a sufficiently long signing secret', () => {
    expect(readSecret({ UPLOAD_SIGNING_SECRET: 'short' })).toBeNull();
    expect(readSecret({})).toBeNull();
    expect(readSecret({ UPLOAD_SIGNING_SECRET: SECRET })).toBe(SECRET);
  });
});

describe('download links', () => {
  const ref = {
    day: '2026-09-24',
    uid: '0b5c3a8e-1f2d-4c3b-9a8e-7d6c5b4a3f21',
    fid: '9f8e7d6c-5b4a-4c3b-8a1f-0e1d2c3b4a59',
    exp: downloadExpiry('2026-09-24'),
  };

  it('verifies a signed link and rejects manipulation or expiry', () => {
    const params = new URL(downloadPath(ref, SECRET), 'https://3d-windt.de').searchParams;
    expect(verifyDownload(params, SECRET, ref.exp - 10)).toEqual(ref);
    expect(verifyDownload(params, SECRET, ref.exp + 1)).toBeNull();

    const otherFile = new URLSearchParams(params);
    otherFile.set('f', ref.uid);
    expect(verifyDownload(otherFile, SECRET, ref.exp - 10)).toBeNull();

    const longer = new URLSearchParams(params);
    longer.set('e', String(ref.exp + 86400));
    expect(verifyDownload(longer, SECRET, ref.exp - 10)).toBeNull();
  });

  it('expires links one day after the retention period', () => {
    const created = Date.parse('2026-09-24T00:00:00Z') / 1000;
    expect(ref.exp - created).toBe((UPLOAD_POLICY.retentionDays + 1) * 86400);
  });
});

describe('helpers', () => {
  it('sanitises file names', () => {
    expect(sanitizeFileName('../../etc/passwd.stl')).toBe('passwd.stl');
    expect(sanitizeFileName('C:\\CAD\\Halter "v2".step')).toBe('Halter _v2_.step');
    expect(sanitizeFileName('a\u0000b.stl')).toBe('a_b.stl');
  });

  it('keeps files and part receipts under the lifecycle prefixes', () => {
    expect(fileKey('2026-09-24', 'u', 'f')).toBe('uploads/files/2026-09-24/u/f');
    expect(manifestKey('2026-09-24', 'u')).toBe('uploads/files/2026-09-24/u/manifest.json');
    expect(partReceiptKey('2026-09-24', 'u', 'f', 7)).toBe('uploads/parts/2026-09-24/u/f/00007');
  });

  it('computes chunk byte ranges of an assembled file', () => {
    const file = { size: 20, chunks: 3, chunkBytes: 8 };
    expect(chunkRange(file, 0)).toEqual({ offset: 0, length: 8 });
    expect(chunkRange(file, 2)).toEqual({ offset: 16, length: 4 });
    expect(chunkRange(file, 3)).toBeNull();
    expect(chunkRange(file, -1)).toBeNull();
  });

  it('enforces same-origin POSTs', () => {
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', 'https://3d-windt.de')).toBe(true);
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', 'https://evil.example')).toBe(false);
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', null)).toBe(false);
  });

});

describe('R2 lifecycle rules (infra/r2-lifecycle.json)', () => {
  type Rule = {
    id: string;
    enabled: boolean;
    conditions: { prefix: string };
    deleteObjectsTransition?: { condition: { type: string; maxAge: number } };
    abortMultipartUploadsTransition?: { condition: { type: string; maxAge: number } };
  };
  const { rules } = JSON.parse(readFileSync(new URL('../infra/r2-lifecycle.json', import.meta.url), 'utf8')) as {
    rules: Rule[];
  };
  const byPrefix = (prefix: string) => rules.find((rule) => rule.conditions.prefix === prefix);
  const days = (value: number) => value * 86_400;

  it('deletes completed uploads after retentionDays and aborts incomplete ones after incompleteRetentionDays', () => {
    const files = byPrefix(FILES_PREFIX);
    expect(files?.enabled).toBe(true);
    expect(files?.deleteObjectsTransition?.condition).toEqual({ type: 'Age', maxAge: days(UPLOAD_POLICY.retentionDays) });
    expect(files?.abortMultipartUploadsTransition?.condition).toEqual({
      type: 'Age',
      maxAge: days(UPLOAD_POLICY.incompleteRetentionDays),
    });
  });

  it('deletes part receipts after incompleteRetentionDays', () => {
    const parts = byPrefix(PARTS_PREFIX);
    expect(parts?.enabled).toBe(true);
    expect(parts?.deleteObjectsTransition?.condition).toEqual({
      type: 'Age',
      maxAge: days(UPLOAD_POLICY.incompleteRetentionDays),
    });
  });

  it('never expires lead records automatically', () => {
    expect(rules.some((rule) => rule.deleteObjectsTransition && 'leads/'.startsWith(rule.conditions.prefix))).toBe(false);
  });
});

describe('lead e-mail file links', () => {
  it('accepts exactly the links produced by upload-complete and rejects anything else', () => {
    const path = downloadPath(
      {
        day: '2026-09-24',
        uid: '0b5c3a8e-1f2d-4c3b-9a8e-7d6c5b4a3f21',
        fid: '9f8e7d6c-5b4a-4c3b-8a1f-0e1d2c3b4a59',
        exp: downloadExpiry('2026-09-24'),
      },
      SECRET,
    );
    const links = toFileLinks([
      { name: 'halter.step', size: 1024, path },
      { name: 'phish', size: 1, path: 'https://evil.example/datei-abruf/?x' },
      { name: 'other', size: 1, path: '/datei-abruf/?u=x' },
    ]);
    expect(links).toEqual([{ name: 'halter.step', size: 1024, path }]);
  });
});
