export declare const PAYMENT_LINK_VERSION: 'v1';
export declare const PAYMENT_LINK_PATH: '/bezahlen/';
export declare const MIN_SECRET_LENGTH: number;
export declare const MIN_AMOUNT_CENTS: number;
export declare const MAX_AMOUNT_CENTS: number;
export declare const MAX_LINK_VALIDITY_SECONDS: number;

export interface PaymentLink {
  quoteNumber: string;
  amountCents: number;
  /** Unix timestamp in seconds. */
  expiresAt: number;
}

export type PaymentLinkFailure = 'malformed' | 'bad_signature' | 'expired';

export type PaymentLinkVerification =
  | { ok: true; link: PaymentLink }
  | { ok: false; reason: PaymentLinkFailure };

export interface PaymentLinkParams {
  q?: unknown;
  a?: unknown;
  e?: unknown;
  s?: unknown;
}

export declare function isValidSecret(secret: unknown): secret is string;
export declare function isValidQuoteNumber(value: unknown): value is string;
export declare function isValidAmountCents(value: unknown): value is number;
export declare function createPaymentLinkQuery(
  link: PaymentLink,
  secret: string,
  nowSeconds: number,
): string;
export declare function verifyPaymentLink(
  params: PaymentLinkParams,
  secret: string,
  nowSeconds: number,
): PaymentLinkVerification;
export declare function parseEuroAmountToCents(input: string): number;
