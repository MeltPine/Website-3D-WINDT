import { createHash } from 'node:crypto';
import type { KVNamespaceLike } from './env';
import { jsonResponse } from './http';

export interface RateLimitRule {
  /** Stable name of the protected endpoint, part of the KV key. */
  scope: string;
  /** Maximum accepted requests per window and client. */
  limit: number;
  /** Fixed window length in seconds (>= 60, the KV minimum TTL). */
  windowSeconds: number;
}

export const RATE_LIMITS = {
  lead: { scope: 'lead', limit: 5, windowSeconds: 600 },
  leadAlert: { scope: 'lead-alert', limit: 10, windowSeconds: 600 },
  uploadInit: { scope: 'upload-init', limit: 10, windowSeconds: 60 },
  checkout: { scope: 'checkout', limit: 10, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Client key: truncated SHA-256 of the connecting IP. The raw address is
 * never stored; the key expires 60 s after its window ends.
 */
export function clientKey(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

export function rateLimitKey(rule: RateLimitRule, client: string, nowMs: number): string {
  const window = Math.floor(nowMs / 1000 / rule.windowSeconds);
  return `rl:${rule.scope}:${client}:${window}`;
}

/**
 * Fixed-window counter in Workers KV. Approximate by design: KV is eventually
 * consistent and has no atomic increment, so concurrent requests (or requests
 * served by different Cloudflare locations) can undercount. It stops
 * sustained abuse from one client, not bursts; the Cloudflare WAF rate-limit
 * rule described in docs/cloudflare-migration.md is the hard limit.
 *
 * Fails open: if KV is unavailable the request is allowed (and logged), so a
 * KV incident can never block lead capture or payments.
 */
export async function enforceRateLimit(
  kv: KVNamespaceLike,
  rule: RateLimitRule,
  request: Request,
  nowMs: number,
): Promise<Response | null> {
  const key = rateLimitKey(rule, clientKey(request), nowMs);
  const nowSeconds = Math.floor(nowMs / 1000);
  const windowEnd = (Math.floor(nowSeconds / rule.windowSeconds) + 1) * rule.windowSeconds;
  const secondsLeft = Math.max(1, windowEnd - nowSeconds);
  try {
    const current = Number.parseInt((await kv.get(key)) ?? '0', 10);
    const count = Number.isFinite(current) && current > 0 ? current : 0;
    if (count >= rule.limit) {
      const retryAfter = secondsLeft;
      return jsonResponse(
        429,
        { error: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' },
        { 'Retry-After': String(retryAfter) },
      );
    }
    // Expires 60 s after the window ends, independent of later writes, so a
    // counter never lives longer than windowSeconds + 60 (privacy page).
    await kv.put(key, String(count + 1), { expirationTtl: secondsLeft + 60 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[rate-limit] KV unavailable for ${rule.scope}, allowing request: ${reason}`);
  }
  return null;
}
