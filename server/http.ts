import type { Env } from './env';
import { isSameOriginRequest, readSecret } from './uploadCore';

const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function jsonResponse(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export function binaryResponse(data: ArrayBuffer): Response {
  return new Response(data, {
    status: 200,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/octet-stream' },
  });
}

/**
 * Common preconditions of the mutating upload endpoints. Returns either the
 * signing secret or the error response to send.
 */
export function guardMutatingRequest(request: Request, env: Env): { secret: string } | { response: Response } {
  if (request.method !== 'POST') {
    return { response: jsonResponse(405, { error: 'Methode nicht erlaubt.' }, { Allow: 'POST' }) };
  }
  if (!isSameOriginRequest(request.url, request.headers.get('origin'))) {
    return { response: jsonResponse(403, { error: 'Anfrage nicht erlaubt.' }) };
  }
  const secret = readSecret(env);
  if (!secret) {
    console.error('UPLOAD_SIGNING_SECRET is missing or shorter than 32 characters; uploads are disabled.');
    return { response: jsonResponse(503, { error: 'Der Datei-Upload ist derzeit nicht verfügbar.' }) };
  }
  return { secret };
}

export function declaredContentLength(request: Request): number | null {
  const raw = request.headers.get('content-length');
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
}

/**
 * Reads the body as bytes, refusing more than `maxBytes` (declared length is
 * checked first, the actual length after reading, because chunked transfer
 * encoding carries no Content-Length).
 */
export async function readLimitedBytes(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = declaredContentLength(request);
  if (declared !== null && declared > maxBytes) {
    return null;
  }
  const data = new Uint8Array(await request.arrayBuffer());
  return data.byteLength > maxBytes ? null : data;
}
