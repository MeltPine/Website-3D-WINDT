/*
 * The STEP kernel (occt-import-js, Emscripten/embind) generates JavaScript
 * with `new Function` at start-up, which requires 'unsafe-eval'. The site-wide
 * CSP (public/_headers) must not allow that.
 *
 * Cloudflare Pages applies `_headers` only to static assets, never to
 * responses of Pages Functions. The geometry worker is therefore started
 * through /api/geometry-worker (functions/api/geometry-worker.ts), which
 * returns a one-line module importing the hashed worker bundle, with its own
 * narrow CSP. A dedicated worker is governed by the CSP of its entry script,
 * so the relaxation applies to that worker only, never to a document.
 */

export const WORKER_CSP =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; connect-src 'self'";

/** Only Vite-built worker bundles under /assets/ may be imported. */
const ENTRY_PATTERN = /^\/assets\/geometry\.worker-[A-Za-z0-9_-]{6,}\.js$/;

export function workerBootstrapSource(entry: string | null): string | null {
  if (!entry || !ENTRY_PATTERN.test(entry)) {
    return null;
  }
  return `import ${JSON.stringify(entry)};\n`;
}

/** Response of GET /api/geometry-worker?entry=/assets/geometry.worker-<hash>.js */
export function handleGeometryWorker(request: Request): Response {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain', Allow: 'GET, HEAD' },
    });
  }
  const source = workerBootstrapSource(new URL(request.url).searchParams.get('entry'));
  if (!source) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response(request.method === 'HEAD' ? null : source, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Content-Security-Policy': WORKER_CSP,
      'X-Content-Type-Options': 'nosniff',
      // The entry parameter contains the content hash of the worker bundle.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
