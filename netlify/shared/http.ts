import { isSameOriginRequest, readSecret } from './uploadCore';

const BASE_HEADERS: Readonly<Record<string, string>> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
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
export function guardMutatingRequest(request: Request): { secret: string } | { response: Response } {
  if (request.method !== 'POST') {
    return { response: jsonResponse(405, { error: 'Methode nicht erlaubt.' }) };
  }
  if (!isSameOriginRequest(request.url, request.headers.get('origin'))) {
    return { response: jsonResponse(403, { error: 'Anfrage nicht erlaubt.' }) };
  }
  const secret = readSecret(process.env);
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
