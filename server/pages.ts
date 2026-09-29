import { randomUUID } from 'node:crypto';
import { requireBindings, stringEnv, type Bindings, type Env, type PagesContext, type PagesHandler } from './env';
import { jsonResponse } from './http';

export interface AdapterContext {
  request: Request;
  env: Env;
  bindings: Bindings;
  waitUntil: PagesContext['waitUntil'];
}

/**
 * Wraps a platform-neutral handler as a Pages Function: resolves bindings and
 * string env once, and turns unexpected exceptions (e.g. a missing binding)
 * into a JSON 500 instead of Cloudflare's HTML error page.
 */
export function pagesHandler(handler: (context: AdapterContext) => Response | Promise<Response>): PagesHandler {
  return async (context) => {
    try {
      return await handler({
        request: context.request,
        env: stringEnv(context.env),
        bindings: requireBindings(context.env),
        waitUntil: (promise) => context.waitUntil(promise),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`[pages] Unhandled error on ${new URL(context.request.url).pathname}: ${reason}`);
      return jsonResponse(500, { error: 'Interner Fehler.' });
    }
  };
}

export const systemClock = {
  now: () => new Date(),
  nowMs: () => Date.now(),
  nowSeconds: () => Math.floor(Date.now() / 1000),
};

export const newId = (): string => randomUUID();
