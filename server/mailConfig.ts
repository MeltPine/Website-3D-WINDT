import type { Env } from './env';
import type { ConfigResult } from './paymentConfig';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

export interface MailConfig {
  resendApiKey: string;
  from: string;
  to: string;
}

/**
 * Internal notifications (Stripe payments, funnel alerts): sender
 * LEAD_ALERT_FROM, or LEAD_REPLY_FROM when no dedicated alert sender is set.
 * No built-in addresses: unset = notification channel not configured.
 */
export function readMailConfig(env: Env): ConfigResult<MailConfig> {
  const resendApiKey = (env.RESEND_API_KEY ?? '').trim();
  const from = (env.LEAD_ALERT_FROM ?? env.LEAD_REPLY_FROM ?? '').trim();
  const to = (env.LEAD_SALES_EMAIL ?? '').trim();
  if (!resendApiKey) {
    return { ok: false, problem: 'RESEND_API_KEY is not set.' };
  }
  if (!from) {
    return { ok: false, problem: 'LEAD_ALERT_FROM (or LEAD_REPLY_FROM) is not set.' };
  }
  if (!isEmailAddress(to)) {
    return { ok: false, problem: 'LEAD_SALES_EMAIL is not set or not an e-mail address.' };
  }
  return { ok: true, value: { resendApiKey, from, to } };
}

/** Lead mails: sales notification and customer confirmation, sent as LEAD_REPLY_FROM. */
export function readLeadMailConfig(env: Env): ConfigResult<MailConfig> {
  const resendApiKey = (env.RESEND_API_KEY ?? '').trim();
  const from = (env.LEAD_REPLY_FROM ?? '').trim();
  const to = (env.LEAD_SALES_EMAIL ?? '').trim();
  if (!resendApiKey) {
    return { ok: false, problem: 'RESEND_API_KEY is not set.' };
  }
  if (!from) {
    return { ok: false, problem: 'LEAD_REPLY_FROM is not set.' };
  }
  if (!isEmailAddress(to)) {
    return { ok: false, problem: 'LEAD_SALES_EMAIL is not set or not an e-mail address.' };
  }
  return { ok: true, value: { resendApiKey, from, to } };
}
