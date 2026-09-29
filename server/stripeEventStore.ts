import type { KVNamespaceLike } from './env';
import type { ClaimResult, ProcessedEventStore } from './stripeWebhook';

/**
 * A claim that was never completed (function crashed mid-way) may be taken
 * over after this long. Resend's idempotency key covers the overlap.
 */
export const STALE_CLAIM_MS = 10 * 60 * 1000;
/** Stripe retries a failed delivery for up to 3 days; keep markers well beyond. */
export const EVENT_MARKER_TTL_SECONDS = 30 * 24 * 60 * 60;

interface EventRecord {
  status: 'processing' | 'done';
  type: string;
  updatedAt: number;
}

export function eventMarkerKey(eventId: string): string {
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) {
    throw new Error('Unexpected Stripe event id format.');
  }
  return `stripe-event:${eventId}`;
}

function parseRecord(raw: string | null): EventRecord | null {
  if (raw === null) {
    return null;
  }
  try {
    const candidate = JSON.parse(raw) as Partial<EventRecord> | null;
    if (
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate.status === 'processing' || candidate.status === 'done') &&
      typeof candidate.updatedAt === 'number'
    ) {
      return candidate as EventRecord;
    }
  } catch {
    // treated as absent/stale below
  }
  return null;
}

/**
 * Idempotency markers for Stripe events in Workers KV (binding STATE).
 * Stores only event id, type and timestamps.
 *
 * KV has no compare-and-swap and is eventually consistent (a write can take
 * up to ~60 s to be visible in other locations). Two deliveries of the same
 * event that hit different locations within that window can therefore both
 * claim it. That case is covered by the Resend idempotency key
 * `stripe-event-<id>` (24 h window): the second send is a no-op. Residual
 * risk: a duplicate internal notification if a marker write is lost and Stripe
 * redelivers more than 24 h later. Only an internal e-mail is affected; the
 * payment itself is never processed here.
 */
export function createKvEventStore(kv: KVNamespaceLike): ProcessedEventStore {
  const write = (key: string, record: EventRecord) =>
    kv.put(key, JSON.stringify(record), { expirationTtl: EVENT_MARKER_TTL_SECONDS });

  return {
    async claim(eventId, eventType, nowMs): Promise<ClaimResult> {
      const key = eventMarkerKey(eventId);
      const existing = parseRecord(await kv.get(key));
      if (existing?.status === 'done') {
        return 'done';
      }
      if (existing?.status === 'processing' && nowMs - existing.updatedAt < STALE_CLAIM_MS) {
        return 'in_progress';
      }
      await write(key, { status: 'processing', type: eventType, updatedAt: nowMs });
      return 'claimed';
    },

    async complete(eventId, eventType, nowMs): Promise<void> {
      await write(eventMarkerKey(eventId), { status: 'done', type: eventType, updatedAt: nowMs });
    },

    async release(eventId): Promise<void> {
      await kv.delete(eventMarkerKey(eventId));
    },
  };
}
