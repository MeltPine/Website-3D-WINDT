import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PagesContext, PagesEnv, PagesHandler } from '../server/env';
import { MemoryKV, MemoryR2 } from './helpers/cloudflare';
import * as checkout from '../functions/api/checkout';
import * as geometryWorker from '../functions/api/geometry-worker';
import * as lead from '../functions/api/lead';
import * as leadAlert from '../functions/api/lead-alert';
import * as paymentLink from '../functions/api/payment-link';
import * as stripeWebhook from '../functions/api/stripe/webhook';
import * as uploadChunk from '../functions/api/uploads/chunk';
import * as uploadComplete from '../functions/api/uploads/complete';
import * as uploadFile from '../functions/api/uploads/file';
import * as uploadInit from '../functions/api/uploads/init';

const SITE = 'https://3d-windt.de';

function context(request: Request, env: Partial<PagesEnv> | Record<string, unknown>): PagesContext {
  return { request, env: env as PagesEnv, waitUntil: () => undefined };
}

function bindings(extra: Record<string, unknown> = {}) {
  return { UPLOADS: new MemoryR2(), STATE: new MemoryKV(), ...extra };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('Pages Functions adapters', () => {
  const routes: Array<[string, PagesHandler]> = [
    ['/api/checkout', checkout.onRequest],
    ['/api/geometry-worker', geometryWorker.onRequest],
    ['/api/lead', lead.onRequest],
    ['/api/lead-alert', leadAlert.onRequest],
    ['/api/payment-link', paymentLink.onRequest],
    ['/api/stripe/webhook', stripeWebhook.onRequest],
    ['/api/uploads/chunk', uploadChunk.onRequest],
    ['/api/uploads/complete', uploadComplete.onRequest],
    ['/api/uploads/file', uploadFile.onRequest],
    ['/api/uploads/init', uploadInit.onRequest],
  ];

  it('export an onRequest handler per route', () => {
    for (const [, handler] of routes) {
      expect(typeof handler).toBe('function');
    }
  });

  it('turn a missing binding into a JSON 500 instead of an HTML error page', async () => {
    const response = await lead.onRequest(context(new Request(`${SITE}/api/lead`, { method: 'POST' }), {}));
    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('answer an unconfigured payment link with 503, not 404', async () => {
    const response = await paymentLink.onRequest(context(new Request(`${SITE}/api/payment-link?q=A-1`), bindings()));
    expect(response.status).toBe(503);
  });

  it('pass only string vars to the handlers (bindings are not config)', async () => {
    const env = bindings({ UPLOAD_SIGNING_SECRET: 's'.repeat(48) });
    const request = new Request(`${SITE}/api/uploads/init`, {
      method: 'POST',
      headers: { Origin: SITE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [{ name: 'a.stl', size: 10 }] }),
    });
    const response = await uploadInit.onRequest(context(request, env));
    expect(response.status).toBe(200);
    expect(env.UPLOADS.multipart.size).toBe(1);
  });

  it('answer a webhook without configuration with 500 so Stripe retries', async () => {
    const request = new Request(`${SITE}/api/stripe/webhook`, { method: 'POST', body: '{}' });
    const response = await stripeWebhook.onRequest(context(request, bindings()));
    expect(response.status).toBe(500);
  });
});
