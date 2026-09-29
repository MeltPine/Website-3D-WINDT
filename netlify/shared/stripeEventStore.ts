import type { ClaimResult, ProcessedEventStore } from './stripeWebhook';

export const STRIPE_EVENT_STORE_NAME = 'stripe-events';
export const STRIPE_EVENT_STORE_REGION = 'eu-central-1';
/**
 * A claim that was never completed (function crashed mid-way) may be taken
 * over after this long. Resend's idempotency key covers the overlap.
 */
export const STALE_CLAIM_MS = 10 * 60 * 1000;

interface EventRecord {
  status: 'processing' | 'done';
  type: string;
  updatedAt: number;
}

/** The subset of the Netlify Blobs `Store` API used here. */
export interface BlobStoreLike {
  setJSON(
    key: string,
    data: unknown,
    options: { onlyIfNew: true } | { onlyIfMatch: string },
  ): Promise<{ modified: boolean }>;
  getWithMetadata(
    key: string,
    options: { type: 'json' },
  ): Promise<{ data: unknown; etag?: string } | null>;
  delete(key: string): Promise<void>;
}

function keyFor(eventId: string): string {
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) {
    throw new Error('Unexpected Stripe event id format.');
  }
  return `events/${eventId}`;
}

function isRecord(value: unknown): value is EventRecord {
  const candidate = value as Partial<EventRecord> | null;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    (candidate.status === 'processing' || candidate.status === 'done') &&
    typeof candidate.updatedAt === 'number'
  );
}

/**
 * Idempotency ledger on Netlify Blobs using conditional writes: `onlyIfNew`
 * makes the first claim atomic, `onlyIfMatch` makes the stale takeover and
 * the completion race-free.
 */
export function createBlobEventStore(store: BlobStoreLike): ProcessedEventStore {
  return {
    async claim(eventId, eventType, nowMs): Promise<ClaimResult> {
      const key = keyFor(eventId);
      const fresh: EventRecord = { status: 'processing', type: eventType, updatedAt: nowMs };
      const created = await store.setJSON(key, fresh, { onlyIfNew: true });
      if (created.modified) {
        return 'claimed';
      }
      const existing = await store.getWithMetadata(key, { type: 'json' });
      if (!existing) {
        // Deleted between our write attempt and the read (released claim).
        const retry = await store.setJSON(key, fresh, { onlyIfNew: true });
        return retry.modified ? 'claimed' : 'in_progress';
      }
      if (isRecord(existing.data) && existing.data.status === 'done') {
        return 'done';
      }
      const isStale = !isRecord(existing.data) || nowMs - existing.data.updatedAt >= STALE_CLAIM_MS;
      if (isStale && existing.etag) {
        const takeover = await store.setJSON(key, fresh, { onlyIfMatch: existing.etag });
        return takeover.modified ? 'claimed' : 'in_progress';
      }
      return 'in_progress';
    },

    async complete(eventId, eventType, nowMs): Promise<void> {
      const record: EventRecord = { status: 'done', type: eventType, updatedAt: nowMs };
      const key = keyFor(eventId);
      const existing = await store.getWithMetadata(key, { type: 'json' });
      if (existing?.etag) {
        const result = await store.setJSON(key, record, { onlyIfMatch: existing.etag });
        if (result.modified) {
          return;
        }
      }
      const created = await store.setJSON(key, record, { onlyIfNew: true });
      if (!created.modified) {
        throw new Error(`Concurrent update while completing ${eventId}.`);
      }
    },

    async release(eventId): Promise<void> {
      await store.delete(keyFor(eventId));
    },
  };
}
