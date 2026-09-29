import { Buffer } from 'node:buffer';

const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Message shown to buyers whenever payments are misconfigured (fail closed). */
export const PAYMENTS_UNAVAILABLE =
  'Die Online-Zahlung ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns per E-Mail oder Telefon.';

/**
 * Browser POSTs from our own pages always carry an Origin header. Requiring
 * it to match the request origin, together with the JSON content type (which
 * forces a CORS preflight that we never answer), keeps other sites from
 * driving this endpoint from a visitor's browser. No CORS headers are sent.
 */
export function isSameOriginJsonPost(request: Request): boolean {
  if (request.method !== 'POST') {
    return false;
  }
  const origin = request.headers.get('origin');
  if (!origin) {
    return false;
  }
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  return origin === requestOrigin && contentType.startsWith('application/json');
}

/** Reads at most `maxBytes` of the body; returns null if it is larger. */
export async function readLimitedText(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    return null;
  }
  const text = await request.text();
  return Buffer.byteLength(text, 'utf8') > maxBytes ? null : text;
}
