/*
 * The STEP kernel (occt-import-js, Emscripten/embind) generates JavaScript
 * with `new Function` at start-up, which requires 'unsafe-eval'. The site-wide
 * CSP must not allow that, and Netlify custom headers cannot exclude a path.
 *
 * Custom headers are, however, never applied to Function responses. The
 * geometry worker is therefore started through /api/geometry-worker, which
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
