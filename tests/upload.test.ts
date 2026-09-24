import { describe, expect, it } from 'vitest';
import {
  UPLOAD_POLICY,
  chunkCountFor,
  expectedChunkLength,
  validateUploadSelection,
} from '../src/lib/upload/policy';
import {
  bearerToken,
  chunkKey,
  createSession,
  downloadExpiry,
  downloadPath,
  isSameOriginRequest,
  lastSegment,
  readSecret,
  retentionActionForDay,
  sanitizeFileName,
  signSession,
  verifyDownload,
  verifySession,
} from '../netlify/shared/uploadCore';

const SECRET = 'x'.repeat(48);
const MIB = 1024 * 1024;

describe('upload policy', () => {
  it('splits files into fixed-size chunks with a short tail', () => {
    const size = 7 * MIB + 5;
    expect(chunkCountFor(size)).toBe(3);
    expect(expectedChunkLength(size, 0)).toBe(UPLOAD_POLICY.chunkBytes);
    expect(expectedChunkLength(size, 2)).toBe(size - 2 * UPLOAD_POLICY.chunkBytes);
    expect(expectedChunkLength(size, 3)).toBe(-1);
    expect(expectedChunkLength(size, -1)).toBe(-1);
  });

  it('keeps chunks below the effective 4.5 MB Function payload limit', () => {
    expect(UPLOAD_POLICY.chunkBytes).toBeLessThan(4.5 * 1000 * 1000);
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
    const session = createSession([{ name: 'bracket.step', size: 7 * MIB }], now);
    const verified = verifySession(signSession(session, SECRET), SECRET, nowSeconds);
    expect(verified).toEqual(session);
    expect(verified?.day).toBe('2026-09-24');
    expect(verified?.files[0].chunks).toBe(3);
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

  it('builds sortable chunk keys', () => {
    expect(chunkKey('2026-09-24', 'u', 'f', 7)).toBe('2026-09-24/u/f/chunk-00007');
  });

  it('enforces same-origin POSTs', () => {
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', 'https://3d-windt.de')).toBe(true);
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', 'https://evil.example')).toBe(false);
    expect(isSameOriginRequest('https://3d-windt.de/api/uploads/init', null)).toBe(false);
  });

  it('decides retention per day prefix', () => {
    const today = new Date('2026-12-31T12:00:00Z');
    expect(retentionActionForDay('2026-12-30', today)).toBe('keep');
    expect(retentionActionForDay('2026-12-27', today)).toBe('delete-incomplete');
    expect(retentionActionForDay('2026-09-01', today)).toBe('delete-all');
    expect(retentionActionForDay('not-a-day', today)).toBe('keep');
  });

  it('extracts the last directory segment', () => {
    expect(lastSegment('2026-09-24/abc/')).toBe('abc');
    expect(lastSegment('2026-09-24')).toBe('2026-09-24');
  });
});

describe('lead e-mail file links', () => {
  it('accepts exactly the links produced by upload-complete and rejects anything else', async () => {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const { toFileLinks } = require('../netlify/functions/lead-followup.cjs') as {
      toFileLinks: (value: unknown) => Array<{ name: string; href: string | null; path: string }>;
    };
    const path = downloadPath(
      {
        day: '2026-09-24',
        uid: '0b5c3a8e-1f2d-4c3b-9a8e-7d6c5b4a3f21',
        fid: '9f8e7d6c-5b4a-4c3b-8a1f-0e1d2c3b4a59',
        exp: downloadExpiry('2026-09-24'),
      },
      SECRET,
    );
    const previousUrl = process.env.URL;
    process.env.URL = 'https://3d-windt.de';
    try {
      const links = toFileLinks([
        { name: 'halter.step', size: 1024, path },
        { name: 'phish', size: 1, path: 'https://evil.example/datei-abruf/?x' },
        { name: 'other', size: 1, path: '/datei-abruf/?u=x' },
      ]);
      expect(links).toHaveLength(1);
      expect(links[0].href).toBe(`https://3d-windt.de${path}`);
    } finally {
      if (previousUrl === undefined) delete process.env.URL;
      else process.env.URL = previousUrl;
    }
  });
});
