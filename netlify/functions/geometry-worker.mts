import type { Config } from '@netlify/functions';
import { WORKER_CSP, workerBootstrapSource } from '../shared/workerEntry';

/** Serves the geometry worker entry with its own CSP (see ../shared/workerEntry.ts). */
export default async (request: Request): Promise<Response> => {
  const source = workerBootstrapSource(new URL(request.url).searchParams.get('entry'));
  if (!source) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response(source, {
    status: 200,
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Content-Security-Policy': WORKER_CSP,
      'X-Content-Type-Options': 'nosniff',
      // The entry parameter contains the content hash of the worker bundle.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

export const config: Config = {
  path: '/api/geometry-worker',
  method: 'GET',
};
