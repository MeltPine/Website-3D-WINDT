// Signed pay links for individual accepted quotes.
//
// Plain ESM (no TypeScript) on purpose: the same code signs links in the local
// CLI (`scripts/payment-link.mjs`, runs on bare Node) and verifies them in the
// Cloudflare Pages Functions (nodejs_compat). One implementation, no drift.
// Types live in `paymentLink.d.mts`.
//
// Link format: /bezahlen/?q=<quote no.>&a=<net amount in cents>&e=<expiry, unix s>&s=<HMAC>
// The HMAC-SHA256 covers a versioned, delimiter-separated canonical string, so
// no field can be moved into another without breaking the signature.

import { createHmac, timingSafeEqual } from 'node:crypto';

export const PAYMENT_LINK_VERSION = 'v1';
export const PAYMENT_LINK_PATH = '/bezahlen/';
export const MIN_SECRET_LENGTH = 32;
/** Stripe's minimum charge for EUR is 0.50 EUR. */
export const MIN_AMOUNT_CENTS = 50;
/** Upper sanity bound (50,000 EUR net) against typos in the CLI. */
export const MAX_AMOUNT_CENTS = 5_000_000;
/** Links may not be valid for longer than this (180 days). */
export const MAX_LINK_VALIDITY_SECONDS = 180 * 24 * 60 * 60;

const QUOTE_NUMBER_PATTERN = /^[A-Z0-9](?:[A-Z0-9-]{0,38}[A-Z0-9])?$/;
const AMOUNT_PATTERN = /^[1-9]\d{0,8}$/;
const EXPIRY_PATTERN = /^[1-9]\d{9}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** @param {unknown} secret */
export function isValidSecret(secret) {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

/** @param {unknown} value */
export function isValidQuoteNumber(value) {
  return typeof value === 'string' && QUOTE_NUMBER_PATTERN.test(value);
}

/** @param {unknown} value */
export function isValidAmountCents(value) {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= MIN_AMOUNT_CENTS &&
    value <= MAX_AMOUNT_CENTS
  );
}

function canonicalString(quoteNumber, amountCents, expiresAt) {
  return [PAYMENT_LINK_VERSION, quoteNumber, String(amountCents), String(expiresAt)].join('|');
}

function computeSignature(quoteNumber, amountCents, expiresAt, secret) {
  return createHmac('sha256', secret)
    .update(canonicalString(quoteNumber, amountCents, expiresAt), 'utf8')
    .digest('base64url');
}

/**
 * @param {{ quoteNumber: string, amountCents: number, expiresAt: number }} link
 * @param {string} secret
 * @param {number} nowSeconds
 */
export function createPaymentLinkQuery(link, secret, nowSeconds) {
  if (!isValidSecret(secret)) {
    throw new Error(`PAYMENT_LINK_SECRET must be at least ${MIN_SECRET_LENGTH} characters long.`);
  }
  if (!isValidQuoteNumber(link.quoteNumber)) {
    throw new Error(
      'Quote number must be 1-40 characters of A-Z, 0-9 and "-" (e.g. AB-2026-001).',
    );
  }
  if (!isValidAmountCents(link.amountCents)) {
    throw new Error(
      `Amount must be an integer number of cents between ${MIN_AMOUNT_CENTS} and ${MAX_AMOUNT_CENTS}.`,
    );
  }
  if (
    !Number.isSafeInteger(link.expiresAt) ||
    link.expiresAt <= nowSeconds ||
    link.expiresAt - nowSeconds > MAX_LINK_VALIDITY_SECONDS
  ) {
    throw new Error('Expiry must lie in the future and at most 180 days ahead.');
  }
  const params = new URLSearchParams({
    q: link.quoteNumber,
    a: String(link.amountCents),
    e: String(link.expiresAt),
    s: computeSignature(link.quoteNumber, link.amountCents, link.expiresAt, secret),
  });
  return params.toString();
}

/**
 * @param {{ q?: unknown, a?: unknown, e?: unknown, s?: unknown }} params
 * @param {string} secret
 * @param {number} nowSeconds
 */
export function verifyPaymentLink(params, secret, nowSeconds) {
  if (!isValidSecret(secret)) {
    throw new Error('verifyPaymentLink called without a valid secret.');
  }
  const { q, a, e, s } = params;
  if (
    typeof q !== 'string' ||
    typeof a !== 'string' ||
    typeof e !== 'string' ||
    typeof s !== 'string' ||
    !isValidQuoteNumber(q) ||
    !AMOUNT_PATTERN.test(a) ||
    !EXPIRY_PATTERN.test(e) ||
    !SIGNATURE_PATTERN.test(s)
  ) {
    return { ok: false, reason: 'malformed' };
  }
  const amountCents = Number(a);
  const expiresAt = Number(e);
  if (!isValidAmountCents(amountCents)) {
    return { ok: false, reason: 'malformed' };
  }

  const expected = Buffer.from(computeSignature(q, amountCents, expiresAt, secret), 'utf8');
  const provided = Buffer.from(s, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (expiresAt <= nowSeconds) {
    return { ok: false, reason: 'expired' };
  }
  if (expiresAt - nowSeconds > MAX_LINK_VALIDITY_SECONDS) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, link: { quoteNumber: q, amountCents, expiresAt } };
}

/**
 * Parses a user-typed euro amount ("1234.50", "1234,5", "490") into integer
 * cents without floating point. Thousands separators are rejected on purpose:
 * "1.234" is ambiguous.
 * @param {string} input
 */
export function parseEuroAmountToCents(input) {
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) {
    throw new Error(
      `Invalid amount "${input}". Use e.g. 1234.50 or 1234,50 (no thousands separators).`,
    );
  }
  const euros = Number(match[1]);
  const cents = Number((match[2] ?? '0').padEnd(2, '0'));
  return euros * 100 + cents;
}
