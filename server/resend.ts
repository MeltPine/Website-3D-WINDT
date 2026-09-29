export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Sends one message; rejects when the provider did not accept it. */
export type SendMail = (message: MailMessage, apiKey: string, idempotencyKey: string) => Promise<void>;

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const RESEND_TIMEOUT_MS = 10_000;

/**
 * Resend HTTP API. The idempotency key (kept by Resend for 24 h) turns a
 * repeated send of the same logical message into a no-op, which covers
 * retries and the eventual consistency of the KV idempotency markers.
 */
export const sendMailViaResend: SendMail = async (message, apiKey, idempotencyKey) => {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
  });
  if (!response.ok) {
    // The response body may echo recipient data; log only the status.
    throw new Error(`Resend API responded with HTTP ${response.status}`);
  }
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
