import type { TaxMode } from '../src/lib/payment/catalog';
import type { Env } from './env';
import { isValidSecret } from './paymentLink.mjs';

export type { Env };

export type ConfigResult<T> = { ok: true; value: T } | { ok: false; problem: string };

const TAX_MODES: readonly TaxMode[] = ['kleinunternehmer', 'regelbesteuerung'];

/**
 * TAX_MODE has no default on purpose: charging with the wrong tax treatment
 * produces wrong invoices. Unset or unknown -> checkout is refused.
 */
export function readTaxMode(env: Env): ConfigResult<TaxMode> {
  const raw = env.TAX_MODE;
  if (raw === undefined || raw.trim() === '') {
    return { ok: false, problem: 'TAX_MODE is not set; online payments are disabled.' };
  }
  const value = raw.trim();
  if (!(TAX_MODES as readonly string[]).includes(value)) {
    return {
      ok: false,
      problem: `TAX_MODE "${value}" is invalid; expected "kleinunternehmer" or "regelbesteuerung".`,
    };
  }
  return { ok: true, value: value as TaxMode };
}

export interface TaxConfig {
  mode: TaxMode;
  /** Stripe tax rate ID (19 %, exclusive); only set for regelbesteuerung. */
  taxRateId: string | null;
}

export function readTaxConfig(env: Env): ConfigResult<TaxConfig> {
  const mode = readTaxMode(env);
  if (!mode.ok) {
    return mode;
  }
  if (mode.value === 'kleinunternehmer') {
    return { ok: true, value: { mode: mode.value, taxRateId: null } };
  }
  const taxRateId = (env.STRIPE_TAX_RATE_19 ?? '').trim();
  if (!/^txr_[A-Za-z0-9]+$/.test(taxRateId)) {
    return {
      ok: false,
      problem: 'TAX_MODE=regelbesteuerung requires STRIPE_TAX_RATE_19 (txr_...).',
    };
  }
  return { ok: true, value: { mode: mode.value, taxRateId } };
}

export function readPaymentLinkSecret(env: Env): ConfigResult<string> {
  const secret = env.PAYMENT_LINK_SECRET;
  if (!isValidSecret(secret)) {
    return {
      ok: false,
      problem: 'PAYMENT_LINK_SECRET is missing or shorter than 32 characters; quote payments are disabled.',
    };
  }
  return { ok: true, value: secret };
}

export function readStripeSecretKey(env: Env): ConfigResult<string> {
  const key = (env.STRIPE_SECRET_KEY ?? '').trim();
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(key)) {
    return { ok: false, problem: 'STRIPE_SECRET_KEY is missing or malformed (sk_/rk_ test/live key).' };
  }
  return { ok: true, value: key };
}

export function readStripePriceId(env: Env, envVar: string): ConfigResult<string> {
  const priceId = (env[envVar] ?? '').trim();
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
    return { ok: false, problem: `${envVar} is missing or malformed (price_...).` };
  }
  return { ok: true, value: priceId };
}

/**
 * Public origin for Stripe's success/cancel redirects and absolute links in
 * e-mails. Set explicitly as SITE_URL (wrangler.toml [vars]); no fallback to
 * the request host, so a preview deployment never sends customers elsewhere
 * by accident.
 */
export function readSiteOrigin(env: Env): ConfigResult<string> {
  const raw = (env.SITE_URL ?? '').trim();
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, problem: 'SITE_URL (site origin) is not set; cannot build absolute URLs.' };
  }
  const isLocal = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !isLocal) {
    return { ok: false, problem: `SITE_URL "${raw}" must use https.` };
  }
  return { ok: true, value: parsed.origin };
}

export function readWebhookSecret(env: Env): ConfigResult<string> {
  const secret = (env.STRIPE_WEBHOOK_SECRET ?? '').trim();
  if (!/^whsec_\S+$/.test(secret)) {
    return { ok: false, problem: 'STRIPE_WEBHOOK_SECRET is missing or malformed (whsec_...).' };
  }
  return { ok: true, value: secret };
}
