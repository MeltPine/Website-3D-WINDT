import { describe, expect, it } from 'vitest';
import {
  MAX_LINK_VALIDITY_SECONDS,
  createPaymentLinkQuery,
  parseEuroAmountToCents,
  verifyPaymentLink,
} from '../netlify/shared/paymentLink.mjs';

const SECRET = 'test-secret-with-at-least-32-characters!!';
const NOW = 1_790_000_000;
const DAY = 24 * 60 * 60;

function signed(overrides: Partial<{ quoteNumber: string; amountCents: number; expiresAt: number }> = {}) {
  const query = createPaymentLinkQuery(
    { quoteNumber: 'AB-2026-001', amountCents: 123_450, expiresAt: NOW + 14 * DAY, ...overrides },
    SECRET,
    NOW,
  );
  return Object.fromEntries(new URLSearchParams(query)) as { q: string; a: string; e: string; s: string };
}

describe('payment link signing', () => {
  it('accepts an untouched link and returns its values', () => {
    const result = verifyPaymentLink(signed(), SECRET, NOW);
    expect(result).toEqual({
      ok: true,
      link: { quoteNumber: 'AB-2026-001', amountCents: 123_450, expiresAt: NOW + 14 * DAY },
    });
  });

  it('rejects a changed amount', () => {
    const params = { ...signed(), a: '100' };
    expect(verifyPaymentLink(params, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a changed quote number', () => {
    const params = { ...signed(), q: 'AB-2026-002' };
    expect(verifyPaymentLink(params, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects an extended expiry', () => {
    const params = { ...signed(), e: String(NOW + 60 * DAY) };
    expect(verifyPaymentLink(params, SECRET, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a flipped signature character', () => {
    const params = signed();
    const flipped = params.s[0] === 'A' ? 'B' : 'A';
    expect(verifyPaymentLink({ ...params, s: flipped + params.s.slice(1) }, SECRET, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a link signed with another secret', () => {
    const params = signed();
    expect(verifyPaymentLink(params, `${SECRET}-other`, NOW)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('reports expiry only for authentic links', () => {
    const params = signed({ expiresAt: NOW + DAY });
    expect(verifyPaymentLink(params, SECRET, NOW + DAY)).toEqual({ ok: false, reason: 'expired' });
    expect(verifyPaymentLink(params, SECRET, NOW + DAY - 1).ok).toBe(true);
  });

  it('rejects malformed or missing fields', () => {
    const params = signed();
    expect(verifyPaymentLink({ ...params, a: '12.50' }, SECRET, NOW).ok).toBe(false);
    expect(verifyPaymentLink({ ...params, a: '0123' }, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyPaymentLink({ ...params, q: 'ab-2026-001' }, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyPaymentLink({ ...params, s: undefined }, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyPaymentLink({ ...params, a: ['123450'] }, SECRET, NOW)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('refuses to sign out-of-range values', () => {
    expect(() => signed({ amountCents: 49 })).toThrow();
    expect(() => signed({ amountCents: 5_000_001 })).toThrow();
    expect(() => signed({ expiresAt: NOW })).toThrow();
    expect(() => signed({ expiresAt: NOW + MAX_LINK_VALIDITY_SECONDS + 1 })).toThrow();
    expect(() => signed({ quoteNumber: 'AB 2026' })).toThrow();
    expect(() => createPaymentLinkQuery({ quoteNumber: 'AB-1', amountCents: 100, expiresAt: NOW + DAY }, 'short', NOW)).toThrow();
  });

  it('parses euro amounts without floating point errors', () => {
    expect(parseEuroAmountToCents('490')).toBe(49_000);
    expect(parseEuroAmountToCents('1234,5')).toBe(123_450);
    expect(parseEuroAmountToCents('0.29')).toBe(29);
    expect(parseEuroAmountToCents('1019.99')).toBe(101_999);
    expect(() => parseEuroAmountToCents('1.234,00')).toThrow();
    expect(() => parseEuroAmountToCents('-5')).toThrow();
  });
});
